import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, ShieldX, Zap, Lock, ScrollText, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import canonicalize from "canonicalize";

const authorizedPolicy = `{
  "schema_version": "1.0",
  "policy_components": {
    "guardrails": ["no_pii", "content_filter"],
    "rubric": "enterprise_compliance_v2",
    "timestamp": "2025-10-25T15:40:00Z"
  },
  "hash_algo": "SHA-256"
}`;

const sampleToolCall = `{
  "tool": "send_email",
  "args": {
    "to": "customer@example.com",
    "subject": "Your account update",
    "body": "Hello — your settings have changed."
  }
}`;

type Decision = { status: "allow" | "veto"; runtimeHash: string; authorizedHash: string; reason: string };

type AuditEntry = {
  id: string;
  timestamp: string;
  tool: string;
  status: "allow" | "veto";
  authorizedHash: string;
  runtimeHash: string;
  reason: string;
};

async function sha256Canonical(jsonText: string): Promise<string> {
  const parsed = JSON.parse(jsonText);
  const canonical = canonicalize(parsed);
  if (!canonical) throw new Error("Canonicalization failed");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const VetoGateway = () => {
  const [authorized, setAuthorized] = useState(authorizedPolicy);
  const [runtime, setRuntime] = useState(authorizedPolicy);
  const [toolCall, setToolCall] = useState(sampleToolCall);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [checking, setChecking] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const intercept = async () => {
    setChecking(true);
    setDecision(null);
    try {
      const parsedCall = JSON.parse(toolCall);
      const [authorizedHash, runtimeHash] = await Promise.all([
        sha256Canonical(authorized),
        sha256Canonical(runtime),
      ]);
      const match = authorizedHash === runtimeHash;
      const reason = match
        ? "Runtime PSH matches an authorized policy. Tool call permitted."
        : "Runtime PSH does NOT match any authorized policy. Shadow policy detected — call blocked.";
      const status: "allow" | "veto" = match ? "allow" : "veto";
      setDecision({ status, runtimeHash, authorizedHash, reason });
      const entry: AuditEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        tool: typeof parsedCall?.tool === "string" ? parsedCall.tool : "unknown",
        status,
        authorizedHash,
        runtimeHash,
        reason,
      };
      setAuditLog((prev) => [entry, ...prev].slice(0, 100));
      match ? toast.success("Tool call allowed") : toast.error("Tool call vetoed");
    } catch (err) {
      toast.error(`Gateway error: ${err instanceof Error ? err.message : "invalid JSON"}`);
    } finally {
      setChecking(false);
    }
  };

  const tamper = () => {
    setRuntime(runtime.includes('"no_pii"')
      ? runtime.replace('"no_pii"', '"allow_pii"')
      : authorizedPolicy.replace('"no_pii"', '"allow_pii"'));
    setDecision(null);
  };

  const clearLog = () => {
    setAuditLog([]);
    toast.success("Audit log cleared");
  };

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `veto-audit-log-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="py-24">
      <div className="container px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              The <span className="text-gradient-teal">Veto Gateway</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Every tool call is intercepted. Runtime PSH must match an authorized policy — or it's blocked.
            </p>
          </div>

          <Card className="p-8 bg-card border-border">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-secondary" />
                  Authorized Policy Bundle
                </label>
                <Textarea
                  value={authorized}
                  onChange={(e) => { setAuthorized(e.target.value); setDecision(null); }}
                  className="font-mono text-xs min-h-[180px] bg-background border-border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Runtime Policy at Tool-Call Time
                </label>
                <Textarea
                  value={runtime}
                  onChange={(e) => { setRuntime(e.target.value); setDecision(null); }}
                  className="font-mono text-xs min-h-[180px] bg-background border-border"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium mb-3">Intercepted Tool Call</label>
              <Textarea
                value={toolCall}
                onChange={(e) => { setToolCall(e.target.value); setDecision(null); }}
                className="font-mono text-xs min-h-[120px] bg-background border-border"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                onClick={intercept}
                disabled={checking}
                size="lg"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground glow-teal"
              >
                {checking ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Intercepting & verifying…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-5 w-5" />
                    Intercept tool call
                  </>
                )}
              </Button>
              <Button onClick={tamper} variant="outline" size="lg">
                Simulate Shadow Policy
              </Button>
            </div>

            {decision && (
              <div className="mt-8 animate-in slide-in-from-bottom-2 duration-500">
                <div
                  className={`p-6 rounded-lg border-2 ${
                    decision.status === "allow"
                      ? "border-success/50 bg-success/5"
                      : "border-destructive/50 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {decision.status === "allow" ? (
                      <ShieldCheck className="h-8 w-8 text-success" />
                    ) : (
                      <ShieldX className="h-8 w-8 text-destructive" />
                    )}
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        Deterministic Veto
                      </div>
                      <div className={`text-2xl font-bold ${
                        decision.status === "allow" ? "text-success" : "text-destructive"
                      }`}>
                        {decision.status === "allow" ? "ALLOWED" : "BLOCKED"}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground mb-4">{decision.reason}</p>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="text-muted-foreground mb-1">Authorized PSH</div>
                      <div className="hash-font p-2 bg-background border border-border rounded break-all text-secondary">
                        {decision.authorizedHash}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Runtime PSH</div>
                      <div className={`hash-font p-2 bg-background border rounded break-all ${
                        decision.status === "allow"
                          ? "border-success/30 text-success"
                          : "border-destructive/30 text-destructive"
                      }`}>
                        {decision.runtimeHash}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-secondary" />
                  <h3 className="text-lg font-semibold">Audit Log</h3>
                  <span className="text-xs text-muted-foreground">
                    ({auditLog.length} {auditLog.length === 1 ? "entry" : "entries"})
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={exportLog} variant="outline" size="sm" disabled={auditLog.length === 0}>
                    <Download className="h-4 w-4 mr-1" />
                    Export JSON
                  </Button>
                  <Button onClick={clearLog} variant="outline" size="sm" disabled={auditLog.length === 0}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>

              {auditLog.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  No intercepted calls yet. Run the gateway to populate the log.
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto divide-y divide-border">
                    {auditLog.map((entry) => (
                      <div key={entry.id} className="p-4 bg-background/50 hover:bg-background transition-colors">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {entry.status === "allow" ? (
                              <ShieldCheck className="h-4 w-4 text-success" />
                            ) : (
                              <ShieldX className="h-4 w-4 text-destructive" />
                            )}
                            <span
                              className={`text-xs font-bold uppercase tracking-wider ${
                                entry.status === "allow" ? "text-success" : "text-destructive"
                              }`}
                            >
                              {entry.status === "allow" ? "ALLOWED" : "BLOCKED"}
                            </span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs font-mono text-foreground">{entry.tool}</span>
                          </div>
                          <time className="text-xs text-muted-foreground hash-font">
                            {new Date(entry.timestamp).toLocaleString()}
                          </time>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{entry.reason}</p>
                        <div className="grid sm:grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <div className="text-muted-foreground mb-0.5">Authorized PSH</div>
                            <div className="hash-font p-1.5 bg-background border border-border rounded break-all text-secondary">
                              {entry.authorizedHash.slice(0, 32)}…
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-0.5">Runtime PSH</div>
                            <div
                              className={`hash-font p-1.5 bg-background border rounded break-all ${
                                entry.status === "allow"
                                  ? "border-success/30 text-success"
                                  : "border-destructive/30 text-destructive"
                              }`}
                            >
                              {entry.runtimeHash.slice(0, 32)}…
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default VetoGateway;
