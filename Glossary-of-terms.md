#### **C — Canonicalization (RFC 8785)**

The process of converting data with more than one possible representation into a "standard" or normal format. In PolicyFingerprint™, we use **JSON Canonicalization Scheme (JCS)** to ensure that two policy bundles with the same content—regardless of whitespace or key order—always produce the identical **PSH**.

#### **D — Deterministic Veto**

A binary security enforcement mechanism where an action is blocked at the system level if the accompanying cryptographic proof (PSH) does not match the authorized policy. Unlike "probabilistic" guardrails, a deterministic veto is absolute and non-negotiable.

#### **I — Identity Debt**

The accumulated security risk created by deploying high-privilege AI agents without verifiable identities or deterministic governance. This "debt" must eventually be "paid" through audit failures or security breaches unless a provenance layer like PolicyFingerprint™ is implemented.

#### **M — Merkle Tree (Policy Aggregation)**

A data structure where every leaf node is a hash of a policy component and every non-leaf node is a hash of its children. This allows for the verification of a single policy's inclusion in a larger set without needing to download or expose the entire set.

#### **P — Policy State Hash (PSH)**

The unique SHA-256 cryptographic fingerprint of a complete policy bundle. It represents the "DNA" of a specific governance state, encompassing rubric configurations, reward model checksums, and retrieval rules.

#### **P — Provenance (Cryptographic)**

A verifiable record of the origin, history, and governing authority of an AI decision. Cryptographic provenance ensures that an audit trail cannot be tampered with or retroactively altered.

#### **S — Selective Disclosure**

A privacy-preserving technique (enabled by Merkle Trees) that allows an agent to prove it followed a specific, authorized policy to an auditor without revealing the confidential details of the entire policy suite.

#### **S — Shadow Policy**

Any undocumented, unhashed, or "hallucinated" set of rules an AI agent follows that has not been canonicalized into a PSH. Eliminating shadow policies is a primary goal of the PolicyFingerprint™ standard.

---
(c) 2025-2026 Brian M. Green and Health-Vision.AI, LLC, all rights reserved.
