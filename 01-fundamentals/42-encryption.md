# Topic 42: Encryption

> **Track**: Core Concepts — Fundamentals
> **Difficulty**: Intermediate → Advanced
> **Prerequisites**: Topics 1–41 (especially Security, Authentication)

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

### What is Encryption?

**Encryption** transforms readable data (plaintext) into unreadable data (ciphertext) using an algorithm and a key. Only someone with the correct key can reverse it (decrypt).

```mermaid
flowchart TB
    classDef primary fill:#eaf2ff,stroke:#2563eb,stroke-width:1.5px,color:#0f172a;
    classDef secondary fill:#f8fafc,stroke:#94a3b8,stroke-width:1.2px,color:#0f172a;
    linkStyle default stroke:#64748b,stroke-width:1.3px;
    N0["Plaintext: &quot;Credit card: 4111-1111-1111-1111&quot;"]
    class N0 primary
    N1["down Encrypt (key)<br/>Ciphertext: &quot;aGVsbG8gd29ybGQ1Nz...&quot;"]
    class N1 secondary
    N2["down Decrypt (key)<br/>Plaintext: &quot;Credit card: 4111-1111-1111-1111&quot;"]
    class N2 secondary
    N3["Without the key -&gt; ciphertext is meaningless gibberish."]
    class N3 secondary
    N0 --> N1
    N1 --> N2
    N2 --> N3
```

### Symmetric vs Asymmetric Encryption

```mermaid
flowchart TB
    classDef primary fill:#eaf2ff,stroke:#2563eb,stroke-width:1.5px,color:#0f172a;
    classDef secondary fill:#f8fafc,stroke:#94a3b8,stroke-width:1.2px,color:#0f172a;
    linkStyle default stroke:#64748b,stroke-width:1.3px;
    N0["SYMMETRIC: Same key for encrypt and decrypt."]
    class N0 primary
    N1["Alice key=&quot;secret123&quot; -&gt; Encrypt -&gt; ciphertext<br/>Bob key=&quot;secret123&quot; -&gt; Decrypt -&gt; plaintext"]
    class N1 secondary
    N2["Problem: How to share the key securely?<br/>Fast. Used for: data at rest, bulk data encryption.<br/>Algorithms: AES-256, ChaCha20"]
    class N2 secondary
    N3["ASYMMETRIC: Two keys — public key (encrypt) and private key (decrypt)."]
    class N3 secondary
    N4["Alice's PUBLIC key: Anyone can encrypt with it<br/>Alice's PRIVATE key: Only Alice can decrypt"]
    class N4 secondary
    N5["Bob Alice's public key -&gt; Encrypt -&gt; ciphertext<br/>Alice Alice's private key -&gt; Decrypt -&gt; plaintext"]
    class N5 secondary
    N6["Slow but solves key distribution. Used for: key exchange, digital signatures.<br/>Algorithms: RSA, ECDSA, Ed25519"]
    class N6 secondary
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
```

### Comparison

| Aspect | Symmetric | Asymmetric |
|--------|-----------|-----------|
| **Keys** | 1 shared key | Public + private key pair |
| **Speed** | Fast (100-1000× faster) | Slow |
| **Key distribution** | Hard (must share securely) | Easy (public key is public) |
| **Use case** | Bulk data encryption | Key exchange, signatures, TLS handshake |
| **Algorithms** | AES-256, ChaCha20 | RSA-2048, ECDSA, Ed25519 |

### Encryption At Rest vs In Transit

```mermaid
flowchart TB
    classDef primary fill:#eaf2ff,stroke:#2563eb,stroke-width:1.5px,color:#0f172a;
    classDef secondary fill:#f8fafc,stroke:#94a3b8,stroke-width:1.2px,color:#0f172a;
    linkStyle default stroke:#64748b,stroke-width:1.3px;
    N0["AT REST: Data stored on disk (database, S3, backups)."]
    class N0 primary
    N1["Database: AES-256 encryption on disk<br/>S3: Server-side encryption (SSE-S3, SSE-KMS)<br/>Backups: Encrypted before writing to storage"]
    class N1 secondary
    N2["Protects against: stolen hard drives, unauthorized disk access"]
    class N2 secondary
    N3["IN TRANSIT: Data moving over the network."]
    class N3 secondary
    N4["Client &lt;- TLS 1.3 -&gt; Server (HTTPS)<br/>Service A &lt;- mTLS -&gt; Service B (service-to-service)"]
    class N4 secondary
    N5["Protects against: eavesdropping, man-in-the-middle attacks"]
    class N5 secondary
    N6["BOTH are required for a secure system:<br/>At rest: protects stored data<br/>In transit: protects data on the wire"]
    class N6 secondary
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
```

### TLS (Transport Layer Security)

```mermaid
flowchart TB
    classDef primary fill:#eaf2ff,stroke:#2563eb,stroke-width:1.5px,color:#0f172a;
    classDef secondary fill:#f8fafc,stroke:#94a3b8,stroke-width:1.2px,color:#0f172a;
    linkStyle default stroke:#64748b,stroke-width:1.3px;
    N0["TLS secures data in transit (HTTPS = HTTP + TLS)."]
    class N0 primary
    N1["TLS 1.3 Handshake (simplified):"]
    class N1 secondary
    N2["Client Server"]
    class N2 secondary
    N3["ClientHello -&gt; (supported ciphers, random)"]
    class N3 secondary
    N4["&lt;- ServerHello (chosen cipher, certificate)"]
    class N4 secondary
    N5["Verify server certificate<br/>(trusted CA? domain match?)"]
    class N5 secondary
    N6["Key Exchange -&gt; (Diffie-Hellman)"]
    class N6 secondary
    N7["&lt;- Key Exchange"]
    class N7 secondary
    N8["Both derive shared secret<br/>(symmetric key for session)"]
    class N8 secondary
    N9["&lt;- Encrypted data (AES) -&gt; (all subsequent data encrypted)"]
    class N9 secondary
    N10["TLS uses ASYMMETRIC crypto for key exchange (handshake)<br/>then SYMMETRIC crypto for actual data (fast, bulk encryption)."]
    class N10 secondary
    N11["mTLS (Mutual TLS): Both client AND server present certificates.<br/>Used for service-to-service auth in service mesh (Istio/Envoy)."]
    class N11 secondary
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
    N6 --> N7
    N7 --> N8
    N8 --> N9
    N9 --> N10
    N10 --> N11
```

### Hashing vs Encryption

```
HASHING: One-way. Cannot be reversed. Same input → same output.
  Used for: passwords, data integrity, checksums.
  Algorithms: bcrypt, Argon2, SHA-256
  
  hash("password") → "5e884898da..." (cannot get "password" back from hash)

ENCRYPTION: Two-way. Can be reversed with the key.
  Used for: storing sensitive data that needs to be read later.
  
  encrypt("card_number", key) → "aGVsbG8..." → decrypt("aGVsbG8...", key) → "card_number"

When to use which:
  Passwords → HASH (never need the original back)
  Credit cards → ENCRYPT (need to charge later)
  File integrity → HASH (verify not tampered)
  API secrets → ENCRYPT (need to use later)
  Tokens/signatures → HASH (HMAC for verification)
```

### Key Management

```mermaid
flowchart TB
    classDef primary fill:#eaf2ff,stroke:#2563eb,stroke-width:1.5px,color:#0f172a;
    classDef secondary fill:#f8fafc,stroke:#94a3b8,stroke-width:1.2px,color:#0f172a;
    linkStyle default stroke:#64748b,stroke-width:1.3px;
    N0["The encryption is only as strong as the key management."]
    class N0 primary
    N1["KEY MANAGEMENT SERVICE (KMS):<br/>AWS KMS, Google Cloud KMS, Azure Key Vault, HashiCorp Vault"]
    class N1 secondary
    N2["ENVELOPE ENCRYPTION:<br/>Don't encrypt data directly with the master key."]
    class N2 secondary
    N3["1. Generate a Data Encryption Key (DEK)<br/>2. Encrypt data with DEK (fast, symmetric)<br/>3. Encrypt DEK with Master Key (KEK) from KMS<br/>4. Store encrypted DEK alongside encrypted data<br/>5. Discard plaintext DEK from memory"]
    class N3 secondary
    N4["To decrypt:<br/>1. Send encrypted DEK to KMS<br/>2. KMS decrypts DEK using Master Key<br/>3. Use DEK to decrypt data"]
    class N4 secondary
    N5["Stored together:<br/>encrypted_data = AES(data, DEK)<br/>encrypted_dek = KMS_Encrypt(DEK, KEK)"]
    class N5 secondary
    N6["Master Key (KEK) NEVER leaves KMS<br/>Rotate DEKs frequently, KEK rarely"]
    class N6 secondary
    N7["Why envelope encryption?<br/>Master key never exposed (stays in KMS hardware)<br/>Each record/file can have its own DEK<br/>Rotating DEKs doesn't require re-encrypting all data<br/>KMS only handles small keys, not bulk data"]
    class N7 secondary
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
    N6 --> N7
```

---

## B. Interview View

### What Interviewers Expect

| Level | Expectation |
|-------|------------|
| **Junior** | Knows HTTPS, encryption at rest/transit, hashing vs encryption |
| **Mid** | Symmetric vs asymmetric; TLS handshake; AES-256 |
| **Senior** | Envelope encryption, KMS, key rotation, mTLS |
| **Staff+** | Field-level encryption, compliance (PCI-DSS), HSMs, crypto agility |

### Red Flags

- Storing sensitive data without encryption
- Not using HTTPS
- Confusing hashing with encryption
- Not knowing about key management
- Using deprecated algorithms (DES, MD5, SHA-1)

### Common Questions

1. Compare symmetric and asymmetric encryption.
2. How does TLS work?
3. What is encryption at rest vs in transit?
4. What is envelope encryption?
5. How do you manage encryption keys?
6. When do you use hashing vs encryption?

---

## C. Practical Engineering View

### Field-Level Encryption

```mermaid
flowchart TB
    classDef primary fill:#eaf2ff,stroke:#2563eb,stroke-width:1.5px,color:#0f172a;
    classDef secondary fill:#f8fafc,stroke:#94a3b8,stroke-width:1.2px,color:#0f172a;
    linkStyle default stroke:#64748b,stroke-width:1.3px;
    N0["Instead of encrypting the entire database, encrypt specific sensitive fields:"]
    class N0 primary
    N1["Table: users"]
    class N1 secondary
    N2["id name ssn (encrypted) email"]
    class N2 secondary
    N3["1 Alice enc:aGVsbG8gd29y... a@b.com<br/>2 Bob enc:c29ybGQ1Nz... b@c.com"]
    class N3 secondary
    N4["Only SSN is encrypted. Name and email are plaintext.<br/>Application decrypts SSN only when explicitly needed."]
    class N4 secondary
    N5["Benefits:<br/>Limits blast radius (compromised DB doesn't expose SSN)<br/>Different keys for different fields (SSN key vs address key)<br/>Meets PCI-DSS, HIPAA requirements for specific fields"]
    class N5 secondary
    N6["Limitation: Can't query encrypted fields (WHERE ssn = '...' won't work)<br/>Solution: Store a blind index (hash of plaintext) for lookups"]
    class N6 secondary
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
```

### Key Rotation

```
Rotate encryption keys periodically without downtime:

  Strategy 1: RE-ENCRYPT (simple but slow)
    Generate new key → decrypt all data with old key → re-encrypt with new key
    Problem: Slow for large datasets. Downtime risk.

  Strategy 2: KEY VERSIONING (recommended)
    Each encrypted value includes the key version:
      "v2:enc:aGVsbG8gd29y..."
    
    Decrypt: Read version → use corresponding key
    New data: Encrypted with latest key version
    Old data: Lazily re-encrypted on read (read → decrypt with old → re-encrypt with new → save)
    
    Eventually all data migrated to new key.

  Strategy 3: ENVELOPE ENCRYPTION + KMS ROTATION
    Rotate Master Key (KEK) in KMS → old DEKs still work
    KMS handles key version mapping transparently
    AWS KMS: Automatic annual rotation with 1 click
```

### Compliance Requirements

```
PCI-DSS (credit cards):
  • Encrypt card numbers at rest (AES-256)
  • TLS 1.2+ in transit
  • Don't store CVV/CVC after authorization
  • Tokenize card numbers (replace with token, store real number in vault)

HIPAA (health data):
  • Encrypt PHI at rest and in transit
  • Access controls and audit logging
  • Business associate agreements with cloud providers

GDPR (personal data):
  • Encryption is a recommended safeguard
  • Right to erasure: must be able to delete user data
  • Pseudonymization: separate PII from usage data

SOC 2:
  • Encryption at rest and in transit
  • Key management procedures
  • Access controls for encryption keys
```

---

## D. Example: Securing Payment Data

```mermaid
flowchart TB
    classDef primary fill:#eaf2ff,stroke:#2563eb,stroke-width:1.5px,color:#0f172a;
    classDef secondary fill:#f8fafc,stroke:#94a3b8,stroke-width:1.2px,color:#0f172a;
    linkStyle default stroke:#64748b,stroke-width:1.3px;
    N0["Card: 4111... Tokenize<br/>Client -&gt; Payment -&gt; Card Vault<br/>(TLS) Service (HSM-backed)"]
    class N0 primary
    N1["Stores:<br/>tok_abc -&gt;<br/>enc(4111...)"]
    class N1 secondary
    N2["Flow:<br/>1. Client sends card number over HTTPS (TLS 1.3)<br/>2. Payment service sends card to vault for tokenization<br/>3. Vault encrypts card (AES-256-GCM) with envelope encryption<br/>4. Vault returns token: &quot;tok_abc123&quot;<br/>5. Payment service stores token (not real card number)<br/>6. To charge: Payment service sends token -&gt; Vault decrypts -&gt; calls Stripe"]
    class N2 secondary
    N3["Architecture:<br/>Card number NEVER stored in application database<br/>Vault is PCI-DSS compliant (isolated, audited, HSM)<br/>Application only handles tokens (not in PCI scope)<br/>HSM (Hardware Security Module): tamper-proof key storage"]
    class N3 secondary
    N0 --> N1
    N1 --> N2
    N2 --> N3
```

---

## E. HLD and LLD

### E.1 HLD — Encryption Architecture

```mermaid
flowchart TB
    classDef primary fill:#eaf2ff,stroke:#2563eb,stroke-width:1.5px,color:#0f172a;
    classDef secondary fill:#f8fafc,stroke:#94a3b8,stroke-width:1.2px,color:#0f172a;
    linkStyle default stroke:#64748b,stroke-width:1.3px;
    N0["Client &lt;- TLS 1.3 -&gt; Load Balancer"]
    class N0 primary
    N1["Application Services<br/>Field-level encryption for PII<br/>Token-based card handling"]
    class N1 secondary
    N2["Database (RDS) AWS KMS<br/>Encrypted at rest • Master keys (KEK)<br/>(AES-256) • Key rotation<br/>Encrypted fields • Audit trail<br/>TLS connection • HSM-backed"]
    class N2 secondary
    N3["S3 (backups) Card Vault<br/>SSE-KMS • PCI-DSS scope<br/>Bucket policy • HSM encryption<br/>Tokenization"]
    class N3 secondary
    N4["Service-to-service: mTLS (Istio/Envoy sidecar)"]
    class N4 secondary
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
```

### E.2 LLD — Encryption Service

```java
// Dependencies in the original example:
// import os
// import json
// import base64
// from cryptography.hazmat.primitives.ciphers.aead import AESGCM

public class EncryptionService {
    private Object kms;
    private String masterKeyId;

    public EncryptionService(Object kmsClient, String masterKeyId) {
        this.kms = kmsClient;
        this.masterKeyId = masterKeyId;
    }

    public String encryptField(String plaintext) {
        // Encrypt a sensitive field using envelope encryption
        // 1. Generate a data encryption key (DEK)
        // dek_response = kms.generate_data_key(
        // KeyId=master_key_id,
        // KeySpec='AES_256'
        // )
        // plaintext_dek = dek_response['Plaintext']      # 32 bytes
        // encrypted_dek = dek_response['CiphertextBlob']  # KMS-encrypted DEK
        // ...
        return null;
    }

    public String decryptField(String encryptedValue) {
        // Decrypt a field encrypted with encrypt_field
        // if not encrypted_value.startswith("enc:")
        // return encrypted_value  # Not encrypted
        // 1. Parse envelope
        // envelope = json.loads(base64.b64decode(encrypted_value[4:]))
        // encrypted_dek = base64.b64decode(envelope["dek"])
        // nonce = base64.b64decode(envelope["nonce"])
        // ciphertext = base64.b64decode(envelope["data"])
        // ...
        return null;
    }

    public String rotateField(String encryptedValue) {
        // Re-encrypt with current master key (for key rotation)
        // plaintext = decrypt_field(encrypted_value)
        // return encrypt_field(plaintext)
        return null;
    }
}
```

---

## F. Summary & Practice

### Key Takeaways

1. **Symmetric** (AES-256): fast, same key; used for data encryption
2. **Asymmetric** (RSA, ECDSA): slow, key pair; used for key exchange and signatures
3. **At rest**: encrypt stored data (AES-256, SSE-KMS)
4. **In transit**: encrypt network traffic (TLS 1.3, mTLS)
5. **TLS** uses asymmetric for key exchange, then symmetric for bulk data
6. **Hashing** is one-way (passwords); **encryption** is two-way (data you need back)
7. **Envelope encryption**: DEK encrypts data, KEK encrypts DEK; master key never leaves KMS
8. **Key rotation**: key versioning + lazy re-encryption is best approach
9. **Field-level encryption** for PII (SSN, credit cards) — limits blast radius
10. **Tokenization** replaces sensitive data with tokens (PCI-DSS best practice)

### Interview Questions

1. Compare symmetric and asymmetric encryption.
2. How does TLS work?
3. What is encryption at rest vs in transit?
4. What is envelope encryption? Why use it?
5. How do you manage and rotate encryption keys?
6. When do you use hashing vs encryption?
7. How would you encrypt credit card numbers in a payment system?
8. What is field-level encryption?

### Practice Exercises

1. **Exercise 1**: Design the encryption strategy for a healthcare application storing patient records. Cover: at rest, in transit, field-level, key management, and HIPAA compliance.
2. **Exercise 2**: Implement envelope encryption with key rotation. Show how old data encrypted with key v1 is lazily migrated to key v2 on read.
3. **Exercise 3**: Your company needs to become PCI-DSS compliant. Design the card data handling architecture: tokenization, vault, HSM, and scope reduction.

---

> **Previous**: [41 — OAuth 2.0 and JWT](41-oauth-jwt.md)
> **Index**: [Fundamentals README](README.md)
