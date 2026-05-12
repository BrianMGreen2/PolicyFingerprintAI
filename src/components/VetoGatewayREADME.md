VetoGateway README — Current Behavior

Policy flow (3-state: `allow` / `veto` / `human_review`):

1. Load — On mount, fetches all `active` policies from `policy_registry` (optionally filtered by `agent_id`) and the last 100 entries from `veto_audit_log`.
2. Hash — On "Intercept", canonicalizes the runtime policy JSON (RFC 8785 via `canonicalize`) and computes its SHA-256 PSH.
3. Match — Compares the runtime PSH against every active registry PSH:
   - Match → allow (names the matched policy/version).
   - No registry → falls back to comparing against the local Authorized textarea hash.
   - No match → checks audit history for the same runtime PSH:
     - Previously vetoed → veto ("shadow policy, blocked").
     - Otherwise → human_review (first-time unknown PSH).
4. Persist — Inserts into `veto_audit_log` with `policy_id`, hashes, payload, and status. If the DB CHECK constraint rejects `human_review`, falls back to `status='veto'` with an `[HUMAN_REVIEW]` reason prefix; the dashboard's `decodeStatus` reverses this.
5. Reconcile — Replaces the local entry's id/timestamp with the DB row's via `.select().single()`.

Human-review actions (only enabled when `decision.status === "human_review"`):
- Approve & Add to Registry → inserts a new `active` row in `policy_registry` (PSH = runtime hash, agent_id from filter), updates the matching audit row to `allow` with the new `policy_id`, refreshes the policy list, and flips the on-screen decision to allow.
- Reject as Shadow Policy → updates the matching audit row to `veto` with a shadow-policy reason; future calls with the same PSH will be auto-blocked by step 3.

UI controls:
- Agent ID filter (text input) + Active Policy selector (dropdown driven by registry).
- Two JSON editors (Authorized / Runtime) + Tool-Call payload editor; editing any clears the prior decision.
- Buttons: Intercept, Tamper (toggles `no_pii`↔`allow_pii` to demo drift), Approve, Reject, Clear log, Export log (JSON download).
- Decision panel showing status badge, reason, both hashes; audit log list (last 100) with per-entry status coloring.

Integration: Uses `externalSupabase` (separate project), not Lovable Cloud. Dashboard reads the same tables and shares the `HR_PREFIX` decoding convention.
