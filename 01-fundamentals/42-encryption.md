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

```
Plaintext:  "Credit card: 4111-1111-1111-1111"
     │
     ▼  Encrypt (key)
Ciphertext: "aGVsbG8gd29ybGQ1Nz..."
     │
     ▼  Decrypt (key)
Plaintext:  "Credit card: 4111-1111-1111-1111"

Without the key → ciphertext is meaningless gibberish.
```

### Symmetric vs Asymmetric Encryption

```
SYMMETRIC: Same key for encrypt and decrypt.
  
  Alice ──── key="secret123" ────► Encrypt → ciphertext
  Bob   ──── key="secret123" ────► Decrypt → plaintext
  
  Problem: How to share the key securely?
  Fast. Used for: data at rest, bulk data encryption.
  Algorithms: AES-256, ChaCha20

ASYMMETRIC: Two keys — public key (encrypt) and private key (decrypt).

  Alice's PUBLIC key:  Anyone can encrypt with it
  Alice's PRIVATE key: Only Alice can decrypt
  
  Bob   ──── Alice's public key  ────► Encrypt → ciphertext
  Alice ──── Alice's private key ────► Decrypt → plaintext
  
  Slow but solves key distribution. Used for: key exchange, digital signatures.
  Algorithms: RSA, ECDSA, Ed25519
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

```
AT REST: Data stored on disk (database, S3, backups).
  
  Database: AES-256 encryption on disk
  S3: Server-side encryption (SSE-S3, SSE-KMS)
  Backups: Encrypted before writing to storage
  
  Protects against: stolen hard drives, unauthorized disk access

IN TRANSIT: Data moving over the network.
  
  Client ←── TLS 1.3 ──→ Server (HTTPS)
  Service A ←── mTLS ──→ Service B (service-to-service)
  
  Protects against: eavesdropping, man-in-the-middle attacks

BOTH are required for a secure system:
  At rest: protects stored data
  In transit: protects data on the wire
```

### TLS (Transport Layer Security)

```
TLS secures data in transit (HTTPS = HTTP + TLS).

TLS 1.3 Handshake (simplified):

  Client                          Server
    │                               │
    │──── ClientHello ────────────►│  (supported ciphers, random)
    │                               │
    │◄─── ServerHello ────────────│  (chosen cipher, certificate)
    │                               │
    │  Verify server certificate    │
    │  (trusted CA? domain match?)  │
    │                               │
    │──── Key Exchange ──────────►│  (Diffie-Hellman)
    │                               │
    │◄─── Key Exchange ──────────│
    │                               │
    │  Both derive shared secret    │
    │  (symmetric key for session)  │
    │                               │
    │◄══ Encrypted data (AES) ═══►│  (all subsequent data encrypted)

  TLS uses ASYMMETRIC crypto for key exchange (handshake)
  then SYMMETRIC crypto for actual data (fast, bulk encryption).

mTLS (Mutual TLS): Both client AND server present certificates.
  Used for service-to-service auth in service mesh (Istio/Envoy).
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

```
The encryption is only as strong as the key management.

KEY MANAGEMENT SERVICE (KMS):
  AWS KMS, Google Cloud KMS, Azure Key Vault, HashiCorp Vault

ENVELOPE ENCRYPTION:
  Don't encrypt data directly with the master key.
  
  1. Generate a Data Encryption Key (DEK)
  2. Encrypt data with DEK (fast, symmetric)
  3. Encrypt DEK with Master Key (KEK) from KMS
  4. Store encrypted DEK alongside encrypted data
  5. Discard plaintext DEK from memory

  To decrypt:
  1. Send encrypted DEK to KMS
  2. KMS decrypts DEK using Master Key
  3. Use DEK to decrypt data

  ┌──────────────────────────────────────────┐
  │  Stored together:                         │
  │  encrypted_data = AES(data, DEK)         │
  │  encrypted_dek  = KMS_Encrypt(DEK, KEK)  │
  │                                            │
  │  Master Key (KEK) NEVER leaves KMS        │
  │  Rotate DEKs frequently, KEK rarely       │
  └──────────────────────────────────────────┘

  Why envelope encryption?
  • Master key never exposed (stays in KMS hardware)
  • Each record/file can have its own DEK
  • Rotating DEKs doesn't require re-encrypting all data
  • KMS only handles small keys, not bulk data
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

```
Instead of encrypting the entire database, encrypt specific sensitive fields:

  Table: users
  ┌──────┬──────────┬──────────────────────┬──────────┐
  │  id  │  name    │  ssn (encrypted)     │  email   │
  ├──────┼──────────┼──────────────────────┼──────────┤
  │  1   │  Alice   │  enc:aGVsbG8gd29y... │  a@b.com │
  │  2   │  Bob     │  enc:c29ybGQ1Nz...   │  b@c.com │
  └──────┴──────────┴──────────────────────┴──────────┘

  Only SSN is encrypted. Name and email are plaintext.
  Application decrypts SSN only when explicitly needed.

  Benefits:
  • Limits blast radius (compromised DB doesn't expose SSN)
  • Different keys for different fields (SSN key vs address key)
  • Meets PCI-DSS, HIPAA requirements for specific fields
  
  Limitation: Can't query encrypted fields (WHERE ssn = '...' won't work)
  Solution: Store a blind index (hash of plaintext) for lookups
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

```
┌────────┐  Card: 4111...  ┌──────────┐  Tokenize  ┌──────────────┐
│ Client │────────────────►│ Payment  │───────────►│ Card Vault   │
│ (TLS)  │                 │ Service  │            │ (HSM-backed) │
└────────┘                 └──────────┘            │              │
                                                    │ Stores:      │
                                                    │ tok_abc →    │
                                                    │  enc(4111...)│
                                                    └──────────────┘

  Flow:
  1. Client sends card number over HTTPS (TLS 1.3)
  2. Payment service sends card to vault for tokenization
  3. Vault encrypts card (AES-256-GCM) with envelope encryption
  4. Vault returns token: "tok_abc123"
  5. Payment service stores token (not real card number)
  6. To charge: Payment service sends token → Vault decrypts → calls Stripe

  Architecture:
  • Card number NEVER stored in application database
  • Vault is PCI-DSS compliant (isolated, audited, HSM)
  • Application only handles tokens (not in PCI scope)
  • HSM (Hardware Security Module): tamper-proof key storage
```

---

## E. HLD and LLD

### E.1 HLD — Encryption Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Client ←── TLS 1.3 ──→ Load Balancer                    │
│                             │                              │
│  ┌──────────────────────────┴────────────────────────┐   │
│  │  Application Services                              │   │
│  │  • Field-level encryption for PII                  │   │
│  │  • Token-based card handling                       │   │
│  └──────────┬──────────────────────────┬─────────────┘   │
│             │                          │                  │
│  ┌──────────┴──────────┐  ┌───────────┴────────────┐    │
│  │  Database (RDS)     │  │  AWS KMS               │    │
│  │  • Encrypted at rest│  │  • Master keys (KEK)   │    │
│  │    (AES-256)        │  │  • Key rotation        │    │
│  │  • Encrypted fields │  │  • Audit trail         │    │
│  │  • TLS connection   │  │  • HSM-backed          │    │
│  └─────────────────────┘  └────────────────────────┘    │
│                                                          │
│  ┌─────────────────────┐  ┌────────────────────────┐    │
│  │  S3 (backups)       │  │  Card Vault            │    │
│  │  • SSE-KMS          │  │  • PCI-DSS scope       │    │
│  │  • Bucket policy    │  │  • HSM encryption      │    │
│  └─────────────────────┘  │  • Tokenization        │    │
│                            └────────────────────────┘    │
│                                                          │
│  Service-to-service: mTLS (Istio/Envoy sidecar)        │
└──────────────────────────────────────────────────────────┘
```

### E.2 LLD — Encryption Service

```python
import os
import json
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class EncryptionService:
    """Field-level encryption using envelope encryption with KMS"""
    
    def __init__(self, kms_client, master_key_id: str):
        self.kms = kms_client
        self.master_key_id = master_key_id

    def encrypt_field(self, plaintext: str) -> str:
        """Encrypt a sensitive field using envelope encryption"""
        # 1. Generate a data encryption key (DEK)
        dek_response = self.kms.generate_data_key(
            KeyId=self.master_key_id,
            KeySpec='AES_256'
        )
        plaintext_dek = dek_response['Plaintext']      # 32 bytes
        encrypted_dek = dek_response['CiphertextBlob']  # KMS-encrypted DEK

        # 2. Encrypt the data with DEK (AES-256-GCM)
        nonce = os.urandom(12)
        aesgcm = AESGCM(plaintext_dek)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)

        # 3. Package: encrypted_dek + nonce + ciphertext
        envelope = {
            "v": 1,  # Version for key rotation
            "dek": base64.b64encode(encrypted_dek).decode(),
            "nonce": base64.b64encode(nonce).decode(),
            "data": base64.b64encode(ciphertext).decode(),
        }

        # 4. Wipe plaintext DEK from memory
        plaintext_dek = None

        return "enc:" + base64.b64encode(json.dumps(envelope).encode()).decode()

    def decrypt_field(self, encrypted_value: str) -> str:
        """Decrypt a field encrypted with encrypt_field"""
        if not encrypted_value.startswith("enc:"):
            return encrypted_value  # Not encrypted

        # 1. Parse envelope
        envelope = json.loads(base64.b64decode(encrypted_value[4:]))
        encrypted_dek = base64.b64decode(envelope["dek"])
        nonce = base64.b64decode(envelope["nonce"])
        ciphertext = base64.b64decode(envelope["data"])

        # 2. Decrypt DEK using KMS
        dek_response = self.kms.decrypt(CiphertextBlob=encrypted_dek)
        plaintext_dek = dek_response['Plaintext']

        # 3. Decrypt data with DEK
        aesgcm = AESGCM(plaintext_dek)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)

        # 4. Wipe DEK
        plaintext_dek = None

        return plaintext.decode()

    def rotate_field(self, encrypted_value: str) -> str:
        """Re-encrypt with current master key (for key rotation)"""
        plaintext = self.decrypt_field(encrypted_value)
        return self.encrypt_field(plaintext)
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
