# Topic 38: Security Fundamentals

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate
> **Prerequisites**: Topics 1–37

---

## Table of Contents

- [A. Concept Explanation](#a-concept-explanation)
- [B. Interview View](#b-interview-view)
- [C. Practical Engineering View](#c-practical-engineering-view)
- [D. Example](#d-example)
- [E. HLD and LLD](#e-hld-and-lld)
- [F. Summary & Practice](#f-summary--practice)

---

## A. Concept Explanation

### Why Security in System Design?

Every system design must address security. A brilliantly designed system that is easily compromised is a failed design. Security should be considered **from the start**, not bolted on later.

```
CIA Triad — the foundation of information security:

  ┌──────────────────┐
  │  CONFIDENTIALITY │  Only authorized users can access data
  ├──────────────────┤
  │  INTEGRITY       │  Data is not tampered with or corrupted
  ├──────────────────┤
  │  AVAILABILITY    │  System is accessible when needed
  └──────────────────┘

  + Non-repudiation: Cannot deny actions (audit trail)
```

### Common Threats (OWASP Top 10 Highlights)

| Threat | Description | Mitigation |
|--------|-------------|-----------|
| **Injection** (SQLi, NoSQLi) | Malicious input executed as code | Parameterized queries, input validation |
| **Broken Authentication** | Weak passwords, session hijacking | MFA, secure session management |
| **Sensitive Data Exposure** | Unencrypted PII, secrets in logs | Encryption at rest/transit, secret vaults |
| **Broken Access Control** | Users access unauthorized resources | RBAC/ABAC, principle of least privilege |
| **Security Misconfiguration** | Default passwords, open ports, verbose errors | Hardening, automated security scans |
| **XSS** (Cross-Site Scripting) | Injecting scripts into web pages | Output encoding, CSP headers |
| **CSRF** (Cross-Site Request Forgery) | Forged requests from authenticated user | CSRF tokens, SameSite cookies |
| **SSRF** (Server-Side Request Forgery) | Server makes requests to internal resources | Allowlist URLs, network segmentation |
| **DDoS** | Overwhelming the system with traffic | Rate limiting, WAF, CDN, auto-scaling |

### Defense in Depth

```
Multiple layers of security — if one layer is breached, others protect:

  ┌────────────────────────────────────────┐
  │  Layer 1: NETWORK                      │
  │  Firewall, VPC, security groups, WAF   │
  │  ┌──────────────────────────────────┐  │
  │  │  Layer 2: EDGE                   │  │
  │  │  API Gateway, rate limiting, DDoS │  │
  │  │  ┌────────────────────────────┐  │  │
  │  │  │  Layer 3: APPLICATION      │  │  │
  │  │  │  Auth, AuthZ, input valid  │  │  │
  │  │  │  ┌──────────────────────┐  │  │  │
  │  │  │  │  Layer 4: DATA       │  │  │  │
  │  │  │  │  Encryption, masking │  │  │  │
  │  │  │  └──────────────────────┘  │  │  │
  │  │  └────────────────────────────┘  │  │
  │  └──────────────────────────────────┘  │
  └────────────────────────────────────────┘
```

### Zero Trust Architecture

```
Traditional: "Trust everything inside the network perimeter"
  Problem: Once an attacker is inside → full access to everything

Zero Trust: "Never trust, always verify"
  Every request is authenticated and authorized, regardless of source.
  
  Principles:
  1. Verify identity for every request (no implicit trust)
  2. Least privilege access (minimal permissions)
  3. Micro-segmentation (services can only reach what they need)
  4. Encrypt all traffic (even internal service-to-service)
  5. Continuous monitoring and validation

  Implementation:
  • mTLS between all services (Istio/Envoy)
  • JWT tokens validated at every service, not just the gateway
  • Network policies in Kubernetes (pod-to-pod restrictions)
  • IAM roles with minimal permissions
```

### Input Validation

```
NEVER trust user input. Validate everything.

  Server-side validation (mandatory):
    • Type checking: Is "age" actually a number?
    • Range checking: Is age between 0 and 150?
    • Length checking: Is name < 255 characters?
    • Format checking: Is email a valid email?
    • Sanitization: Strip HTML tags, escape special characters
    • Allowlist: Only accept known-good values for enums

  SQL Injection prevention:
    BAD:  query = f"SELECT * FROM users WHERE id = {user_input}"
          user_input = "1; DROP TABLE users;"  → deletes table!
    
    GOOD: query = "SELECT * FROM users WHERE id = %s"
          cursor.execute(query, (user_input,))  → parameterized, safe
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows HTTPS, input validation, SQL injection |
| **Mid** | Defense in depth, OWASP top threats, encryption basics |
| **Senior** | Zero trust, threat modeling, security architecture review |
| **Staff+** | Compliance (SOC2, GDPR), security culture, incident response |

### Red Flags

- No mention of security in system design
- Storing passwords in plain text
- No encryption for sensitive data
- Trusting all internal network traffic
- Not considering input validation

### Common Questions

1. How would you secure this system?
2. What are the main security concerns for this design?
3. How do you prevent SQL injection?
4. What is defense in depth?
5. How do you handle secrets management?

---

## C. Practical Engineering View

### Secrets Management

```
NEVER hardcode secrets in code or config files!

BAD:
  DB_PASSWORD = "super_secret_123"  # In source code
  aws_secret_key = "AKIA..."        # In .env committed to git

GOOD:
  Use a secrets manager:
  • AWS Secrets Manager / Parameter Store
  • HashiCorp Vault
  • GCP Secret Manager
  • Azure Key Vault
  • Kubernetes Secrets (encrypted at rest)

  Application code:
    db_password = secrets_manager.get_secret("db/production/password")
    
  Rotation:
    Secrets Manager auto-rotates DB passwords every 30 days
    Application fetches latest secret on each connection
```

### Network Security

```
AWS VPC example:

  ┌──── Public Subnet ─────────────┐
  │  ALB (Load Balancer)           │ ← Internet-facing
  │  NAT Gateway                   │
  └────────┬───────────────────────┘
           │
  ┌────────┴── Private Subnet ─────┐
  │  App Servers (EC2 / ECS)       │ ← No direct internet access
  │  Security Group: Allow ALB:443 │
  └────────┬───────────────────────┘
           │
  ┌────────┴── Private Subnet ─────┐
  │  Database (RDS)                │ ← Most restricted
  │  SG: Allow App servers:5432    │
  │  No internet access at all     │
  └────────────────────────────────┘

  Principle: Minimize attack surface
  • Only ALB is internet-facing
  • App servers can't be reached directly
  • DB can only be reached from app servers
```

### Security Headers

```
HTTP security headers every API/web app should set:

  Strict-Transport-Security: max-age=31536000; includeSubDomains
  → Force HTTPS for 1 year

  Content-Security-Policy: default-src 'self'
  → Prevent XSS by restricting script sources

  X-Content-Type-Options: nosniff
  → Prevent MIME type sniffing

  X-Frame-Options: DENY
  → Prevent clickjacking (embedding in iframe)

  X-XSS-Protection: 1; mode=block
  → Browser XSS filter

  Referrer-Policy: strict-origin-when-cross-origin
  → Control referrer information leakage

  Permissions-Policy: camera=(), microphone=()
  → Restrict browser features
```

---

## D. Example: Securing an E-Commerce Platform

```
┌──────────────────────────────────────────────────────────┐
│  Internet                                                  │
│    │                                                       │
│  ┌─┴──────────────┐                                      │
│  │ CloudFlare WAF │ DDoS protection, bot detection       │
│  └──────┬─────────┘                                      │
│         │                                                  │
│  ┌──────┴─────────┐                                      │
│  │ API Gateway    │ Rate limiting, JWT validation,       │
│  │                │ input validation, CORS               │
│  └──────┬─────────┘                                      │
│         │ mTLS                                            │
│  ┌──────┴─────────┐     ┌──────────────┐                │
│  │ App Services   │────►│ Vault        │ Secrets        │
│  │ (K8s pods)     │     │ (HashiCorp)  │                │
│  │ • AuthZ checks │     └──────────────┘                │
│  │ • Input sanit  │                                      │
│  └──────┬─────────┘                                      │
│         │ encrypted connection                            │
│  ┌──────┴─────────┐                                      │
│  │ Database       │ Encryption at rest (AES-256)         │
│  │ (RDS, private) │ PII columns encrypted                │
│  │                │ Audit logging enabled                 │
│  └────────────────┘                                      │
└──────────────────────────────────────────────────────────┘
```

---

## E. HLD and LLD

### E.1 HLD — Security Architecture

```
┌──────────────────────────────────────────────────────────┐
│  EDGE LAYER                                                │
│  WAF → CDN → API Gateway (rate limit, auth, validation)   │
│                                                            │
│  NETWORK LAYER                                            │
│  VPC → Subnets → Security Groups → Network ACLs          │
│                                                            │
│  APPLICATION LAYER                                        │
│  AuthN (JWT) → AuthZ (RBAC) → Input validation →         │
│  Business logic → Output encoding                         │
│                                                            │
│  DATA LAYER                                               │
│  Encryption at rest → Encryption in transit →             │
│  PII masking → Access logging → Backup encryption         │
│                                                            │
│  OPERATIONS LAYER                                         │
│  Secrets Manager → Audit logs → SIEM → Vulnerability      │
│  scanning → Penetration testing → Incident response       │
└──────────────────────────────────────────────────────────┘
```

### E.2 LLD — Input Validation Middleware

```python
import re
from dataclasses import dataclass

class InputValidator:
    """Validates and sanitizes user input"""
    
    @staticmethod
    def validate_email(email: str) -> str:
        email = email.strip().lower()
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email) or len(email) > 254:
            raise ValueError("Invalid email format")
        return email

    @staticmethod
    def validate_string(value: str, field_name: str,
                       min_len=1, max_len=255, allow_html=False) -> str:
        if not isinstance(value, str):
            raise ValueError(f"{field_name} must be a string")
        value = value.strip()
        if len(value) < min_len or len(value) > max_len:
            raise ValueError(f"{field_name} must be {min_len}-{max_len} chars")
        if not allow_html:
            value = re.sub(r'<[^>]+>', '', value)  # Strip HTML tags
        # Prevent null bytes
        value = value.replace('\x00', '')
        return value

    @staticmethod
    def validate_amount(amount, min_val=0.01, max_val=1_000_000) -> float:
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            raise ValueError("Amount must be a number")
        if amount < min_val or amount > max_val:
            raise ValueError(f"Amount must be between {min_val} and {max_val}")
        return round(amount, 2)

    @staticmethod
    def validate_id(value: str, field_name: str = "id") -> str:
        """Validate UUID or numeric ID"""
        value = str(value).strip()
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        numeric_pattern = r'^\d{1,20}$'
        if not (re.match(uuid_pattern, value) or re.match(numeric_pattern, value)):
            raise ValueError(f"Invalid {field_name}")
        return value


class SecurityMiddleware:
    """Applies security checks to incoming requests"""
    
    def __init__(self, rate_limiter, auth_service):
        self.rate_limiter = rate_limiter
        self.auth = auth_service

    def process_request(self, request):
        # 1. Rate limiting
        if not self.rate_limiter.allow(request.client_ip):
            return Response(429, "Too Many Requests")

        # 2. Security headers
        response_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Strict-Transport-Security": "max-age=31536000",
            "Content-Security-Policy": "default-src 'self'",
        }

        # 3. Authentication
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return Response(401, "Missing authentication")
        
        user = self.auth.validate_token(token)
        if not user:
            return Response(401, "Invalid token")

        # 4. Request size limit
        if request.content_length > 10 * 1024 * 1024:  # 10 MB
            return Response(413, "Request too large")

        request.user = user
        request.response_headers = response_headers
        return None  # Continue to handler
```

---

## F. Summary & Practice

### Key Takeaways

1. **CIA Triad**: Confidentiality, Integrity, Availability — the foundation
2. **Defense in depth**: multiple security layers (network, edge, app, data)
3. **Zero Trust**: never trust, always verify — even internal traffic
4. **Input validation**: parameterized queries, sanitization, allowlists
5. **Secrets management**: Vault/Secrets Manager, never hardcode
6. **Network security**: VPC, private subnets, security groups, least privilege
7. **Security headers**: HSTS, CSP, X-Frame-Options on every response
8. **OWASP Top 10**: injection, broken auth, XSS, CSRF, SSRF, misconfig
9. Always mention security in system design interviews
10. Security is **everyone's responsibility**, not just the security team

### Interview Questions

1. How would you secure this system design?
2. What is defense in depth?
3. How do you prevent SQL injection?
4. What is Zero Trust architecture?
5. How do you manage secrets in a microservices system?
6. What security headers should every web application set?
7. How do you handle DDoS attacks?
8. What are the OWASP Top 10?

### Practice Exercises

1. **Exercise 1**: Perform a security review of a basic e-commerce system design. Identify 10 security improvements.
2. **Exercise 2**: Design the network architecture for a multi-tier application on AWS. Show VPCs, subnets, security groups, and data flow.
3. **Exercise 3**: Your application stores credit card numbers in plain text in the database. Design the migration to a secure architecture.

---

> **Previous**: [37 — Logging, Metrics, Tracing](37-logging-metrics-tracing.md)
> **Next**: [39 — Authentication](39-authentication.md)
