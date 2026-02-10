# Security Policy

## 🛡️ Our Commitment to AI Governance
As a project dedicated to **Deterministic AI Governance**, the security of the PolicyFingerprint™ standard is our highest priority. We recognize that even a well-designed cryptographic provenance layer can have vulnerabilities, and we value the assistance of the security community in identifying and resolving them.

## Reporting a Vulnerability
**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a potential security flaw in the PolicyFingerprint™ specification, PSH canonicalization logic, or the Cipher Agent Flow architecture, please report it privately through one of the following channels:

* **Email:** brian@health-vision.ai
* **Direct Message:** * **Discord:** Send a DM to `bmg_philly_33587_67182`

We will acknowledge receipt of your report within **48 hours** and provide a timeline for investigation and resolution.

## What to Report
We are particularly interested in reports related to:
* **PSH Collisions:** Theoretical or practical ways to produce the same hash from different policy bundles.
* **Canonicalization Bypasses:** Ways to manipulate JSON formatting to alter policy intent without changing the hash.
* **Merkle Proof Forgeries:** Flaws in the selective disclosure logic.
* **Identity Spoofing:** Methods to circumvent the "Identity for Autonomy" birth certificate.

## Our Disclosure Process
1. **Investigation:** We will verify the vulnerability and assess its impact on the PolicyFingerprint™ standard.
2. **Resolution:** We will develop a fix or an update to the specification.
3. **Notification:** We will notify the reporter once the issue is resolved.
4. **Public Announcement:** With your permission, we will credit you for the discovery in our release notes or on our [Substack/Website].

## ⚖️ Scope
This policy applies to the **PolicyFingerprint™** architectural standard and the documentation contained within this repository. As the core implementation is currently in a closed-build phase, we appreciate reports based on the technical specifications and conceptual flows provided.

---
*Thank you for helping us make Agentic AI safer for everyone.*
