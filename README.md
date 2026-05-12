# PolicyFingerprint™ (PF-AI)

**License:** CC BY-ND 4.0 &nbsp;|&nbsp; **Status:** Under Active Development 🛠️

> Shifting AI governance from probabilistic guardrails to deterministic cryptographic enforcement.

---

## 🛡️ The Problem: The "Admin-by-Default" Crisis

Modern AI agents operate as high-privilege non-human identities (NHI). When an agent makes a decision — or a "whopsy" — there is rarely a verifiable record of the exact policy that governed that specific moment.

PolicyFingerprint™ fills this gap by creating an immutable, verifiable "DNA fingerprint" for every AI decision, ensuring that agents cannot hallucinate their authority or bypass Zero Trust perimeters.

---

## 🏗️ What's Built

PolicyFingerprint™ is a working implementation, not just a specification. The following components are live and production-connected.

### 1. PSH Engine — Interactive Demo (`PolicyDemo.tsx`)

A browser-native cryptographic fingerprinting tool. Paste any policy JSON, and the engine:

- Canonicalizes it per **RFC 8785** (Deterministic JSON Canonicalization) — ensuring the same policy always produces the same hash regardless of whitespace or key ordering
- Computes a **SHA-256 digest** via the Web Crypto API
- Returns a 64-character hex fingerprint ready for authorization or Merkle batch inclusion

Any byte-level change to the policy — a single character, a reordered key — produces a completely different hash. This is the foundation of drift detection.

### 2. Veto Gateway — Deterministic Enforcement (`VetoGateway.tsx`)

The core enforcement layer. Every tool call is intercepted before execution and subjected to a PSH verification check.

**How it works:**

1. At authorization time, a policy bundle is hashed to produce the **Authorized PSH**
2. At tool-call time, the agent's runtime policy is hashed to produce the **Runtime PSH**
3. Both hashes are compared deterministically — if they match, the call is permitted; if not, it is **blocked immediately**, no LLM reasoning involved

This is the key distinction from traditional guardrails: the veto is not a suggestion to the model. It is a hard gate at the execution layer.

**Veto Gateway features:**

- Side-by-side authorized vs. runtime policy editor
- One-click "Simulate Shadow Policy" — mutates `no_pii` → `allow_pii` to demonstrate drift detection
- Full SHA-256 hash display for both policies at decision time
- ALLOWED / BLOCKED decision rendered with color-coded UI and plain-English reason
- Human review classification for edge cases requiring escalation

### 3. Audit Log — Cryptographic Provenance (`VetoGateway.tsx`)

Every interception — allow or block — is recorded with full forensic detail:

| Field | Description |
|---|---|
| `id` | UUID per interception event |
| `timestamp` | ISO 8601, millisecond precision |
| `tool` | Name of the intercepted tool call |
| `status` | `allow`, `veto`, or `human_review` |
| `authorized_hash` | Full SHA-256 of the authorized policy |
| `runtime_hash` | Full SHA-256 of the runtime policy |
| `reason` | Plain-English explanation of the decision |
| `tool_call_payload` | Full JSON of the intercepted call (forensic use) |

The in-browser log supports **Export JSON** for offline audit delivery and **Clear** for session management. All entries persist to Supabase (Postgres) in real time, with the drift trigger automatically creating a `policy_drift` record for every veto — no manual intervention required.

### 4. Compliance Dashboard (`Dashboard.tsx`)

A live observability layer reading directly from Supabase. No mock data.

**Metric cards (real-time):**
- Compliant Policies % — averaged across active policy registry entries
- Active Monitoring — tool calls intercepted in the last 24 hours
- Policy Drift — cumulative veto + human review events
- Audit Coverage — percentage of the last 90 days with logged events

**Tables:**
- Policy Registry — all policies with version, agent scope, compliance %, and status
- Active Monitoring by Agent — requests, allowed, vetoed, and human review counts grouped by `agent_id`
- Policy Drift Events — the 10 most recent veto/human review entries with runtime PSH and reason

**Audit Trail Coverage chart:**
- 90-day rolling line chart of daily intercepted-call volume
- Dual Y-axis: raw event count (left) and coverage % (right)
- Summary stats: day coverage %, total events logged, days with no events

The dashboard subscribes to Supabase Realtime on `veto_audit_log` — new interceptions from the Veto Gateway appear instantly without a page refresh.

---

## 🗄️ Database Schema (Supabase / Postgres)

Six tables power the full governance lifecycle:

| Table | Purpose |
|---|---|
| `policy_registry` | Every policy bundle ever defined, with PSH and compliance % |
| `authorized_psh` | The set of PSHs currently authorized to execute; revocable without deleting the policy |
| `veto_audit_log` | Every tool call interception with full forensic payload |
| `policy_drift` | Formal drift records auto-created by Postgres trigger on every veto |
| `active_monitors` | Services under real-time governance tracking |
| `merkle_batches` | Daily Merkle root anchoring for Layer 2 selective disclosure |

A `dashboard_summary` view aggregates the four metric card values in a single query.

---

## 🏛️ The Layered Integrity Model

Three layers balance privacy, granularity, and public trust:

**Layer 1 — Policy State Hash (PSH)**
The cryptographic fingerprint of the complete policy bundle: rubric configs, reward model checksums, retrieval rules, and guardrail scripts. Any byte-level change produces a new PSH.

**Layer 2 — Merkle Tree Aggregation**
Enables selective disclosure. Prove a specific policy was active without exposing your entire proprietary policy set to auditors or third parties.

**Layer 3 — Blockchain / TSA Anchoring**
Periodically anchors the Merkle root to a public ledger or Timestamp Authority for immutable, externally verifiable proof of existence.

---

## 🔍 How This Maps to Production Agentic Systems

PolicyFingerprint™ addresses infrastructure concerns that are increasingly required in enterprise agentic deployments:

**Token and permission governance** — The PSH layer enforces which tools an agent is authorized to call at the execution layer, not at the prompt layer. An agent operating under a mutated or unauthorized policy cannot execute — the veto fires before any tokens are consumed.

**Deterministic RBAC for non-human identities** — Traditional role-based access control assumes a human principal. PolicyFingerprint extends this to NHIs: every agent carries a cryptographic identity tied to its exact authorized policy bundle, not a trust level or a role string.

**Explainability and audit trail** — Every decision produces a structured, machine-readable record: what was called, under which policy, what the runtime hash was, and why it was allowed or blocked. This satisfies the "logging, tracing, and rationale generation" requirement for regulated verticals without relying on LLM-generated explanations.

**Drift detection without probabilistic evaluation** — Policy drift is detected by hash mismatch, not by running an eval pipeline. This is orders of magnitude faster and produces zero false negatives — any deviation from the authorized policy bundle is caught regardless of how subtle.

**Framework-agnostic enforcement** — The PSH verification step is a pure cryptographic operation. It can be implemented as middleware in front of any agent framework: LangChain, CrewAI, AutoGen, AWS Bedrock Agents, or a custom runtime.

---

## 📘 Technical FAQ

**What is a PSH (Policy State Hash)?**
The cryptographic fingerprint of the exact policy bundle governing a specific AI decision. Created by canonicalizing all policy components into deterministic JSON (RFC 8785) and computing a SHA-256 digest. Any byte-level change produces a completely different hash.

**How does this differ from standard guardrails?**
Guardrails are probabilistic — they try to convince the LLM to behave correctly. PolicyFingerprint is deterministic — it makes it cryptographically impossible for an unauthorized policy to execute. The veto does not ask the model for permission.

**How does PSH detect policy drift?**
The SHA-256 digest covers the entire canonicalized policy JSON. Any drift — intentional or otherwise — produces a hash mismatch, which triggers the veto and creates a drift record automatically via Postgres trigger.

**Why canonicalization (RFC 8785)?**
To ensure the same policy always produces the same hash. Without canonicalization, whitespace differences or key reordering would produce different hashes for identical policies, generating false drift alerts.

**What is human_review status?**
A third interception outcome beyond allow/veto. When a tool call cannot be deterministically approved or blocked — for example, when the policy is valid but the tool call payload contains an edge case — the gateway escalates to human review rather than making an autonomous decision. All three outcomes are logged, tracked in the dashboard, and counted toward drift metrics.

---

## 🛡️ PolicyFingerprint™ vs. Traditional Blockchain

| Feature | Standard Blockchain Logging | PolicyFingerprint™ |
|---|---|---|
| Primary goal | Proves *when* a decision occurred | Proves *which policies* governed it |
| Granularity | Coarse: model IDs, timestamps, output hashes | Fine-grained: full PSH with rubric, reward model, retrieval rules |
| Data privacy | Low: public chains leak metadata | High: Merkle selective disclosure |
| Reconstruction | Audit-lite: proves existence, not reasoning | Full lineage: root-cause analysis and regulatory replay |
| Enforcement | Passive: records history after the fact | Active: deterministic veto at the runtime layer |

---

## 🚀 Getting Started (Conceptual)

PolicyFingerprint™ is framework-agnostic. The core implementation is in a closed-build phase; the following flow illustrates how to implement the standard.

**1. Define your policy bundle**

```json
{
  "agent_id": "openclaw-researcher-01",
  "permissions": ["filesystem:read", "web:restricted"],
  "guardrail_hash": "sha256:e3b0c442...",
  "reward_model_v": "2.1.4"
}
```

**2. Generate the fingerprint**

The system canonicalizes the JSON (RFC 8785) and computes a SHA-256 digest.

```
Authorized PSH: sha256:7f8cf2...
```

**3. Implement the veto**

In your agent runtime, every tool call must present the current runtime PSH. If it does not match the authorized PSH, the call is blocked deterministically — no LLM reasoning, no probabilistic scoring.

**4. Read the audit trail**

Every interception writes to `veto_audit_log`. Vetoes automatically create a `policy_drift` record. The compliance dashboard reads both tables live.

---

## 🚀 Roadmap

- [x] Initial architecture & integrity model
- [x] PSH schema specification (alpha)
- [x] Interactive PSH engine (browser-native, RFC 8785 + Web Crypto)
- [x] Deterministic Veto Gateway with shadow policy simulation
- [x] Cryptographic audit log with export and human review classification
- [x] Supabase schema — six-table governance lifecycle
- [x] Live compliance dashboard with Realtime subscriptions
- [x] 90-day audit trail coverage chart
- [x] Postgres drift trigger — auto-creates drift records on veto
- [ ] PSH engine REST API (FastAPI / Docker)
- [ ] Merkle batch engine — daily root computation and anchoring
- [ ] Blockchain / TSA anchoring integration
- [ ] Agent SDK middleware — drop-in PSH verification for LangChain, CrewAI, Bedrock

---

## 🤝 How to Contribute

We are in the Specification & Feedback phase. The core codebase remains private, but community input shapes the standard.

- **Case studies** — open an Issue describing an agentic risk scenario in your industry that needs a deterministic veto
- **Schema discussion** — suggest additional metadata fields for the policy bundle (latency requirements, geographical execution bounds, etc.)
- **Integration ideas** — propose how the PSH layer should interact with frameworks like LangChain, LlamaIndex, AutoGPT, or AWS Bedrock Agents
- **Star the repo** — helps gauge developer interest and prioritize the public alpha

---

## 🏘️ Join the Community

Interested in the private alpha or staying updated on the PolicyFingerprint™ standard? Join the **Agentic Village** at the free Village Green membership level for updates, RFC drafts, and responsible AI discourse.

We are looking for **Community Architects** to help draft the formal RFC for the PolicyFingerprint™ standard.

---

## ⚖️ Intellectual Property & Licensing

The documentation, architectural concepts, and FAQ contained in this repository are licensed under the **Creative Commons Attribution-NoDerivatives 4.0 International License**.

The underlying PSH algorithms, Cipher Agent Flow logic, and proprietary implementation code remain the exclusive intellectual property of Brian M. Green. No license is granted for the commercial use or reproduction of the unpublished source code or trade secrets associated with the PolicyFingerprint™ standard.

© 2025-2026 Brian M. Green and Health-Vision.AI, LLC. All rights reserved.
