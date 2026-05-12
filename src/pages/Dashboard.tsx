import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Shield, Activity, AlertTriangle, AlertCircle, ArrowLeft, CheckCircle, Clock, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { externalSupabase } from "@/lib/externalSupabase";

const HR_PREFIX = "[HUMAN_REVIEW] ";

type PolicyRow = {
  id: string;
  name: string;
  version: string;
  agent_id: string | null;
  status: "active" | "superseded" | "revoked";
  compliance_pct: number | null;
  updated_at: string;
};

type AuditRow = {
  id: string;
  timestamp: string;
  tool: string;
  agent_id: string | null;
  status: "allow" | "veto" | "human_review";
  runtime_hash: string;
  reason: string;
  policy_id: string | null;
};

function classify(row: AuditRow): "allow" | "veto" | "human_review" {
  if (row.status === "allow") return "allow";
  if (row.status === "human_review") return "human_review";
  if ((row.reason ?? "").startsWith(HR_PREFIX)) return "human_review";
  return "veto";
}

const Dashboard = () => {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: pData }, { data: aData }] = await Promise.all([
        externalSupabase
          .from("policy_registry")
          .select("id, name, version, agent_id, status, compliance_pct, updated_at")
          .order("updated_at", { ascending: false }),
        externalSupabase
          .from("veto_audit_log")
          .select("id, timestamp, tool, agent_id, status, runtime_hash, reason, policy_id")
          .order("timestamp", { ascending: false })
          .limit(1000),
      ]);
      setPolicies((pData ?? []) as PolicyRow[]);
      setAudits((aData ?? []) as AuditRow[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = policies.length || 1;
    const active = policies.filter((p) => p.status === "active");
    const compliantPct = active.length
      ? Math.round(
          (active.reduce((s, p) => s + (p.compliance_pct ?? 100), 0) / active.length) * 10
        ) / 10
      : 0;

    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recent = audits.filter((a) => new Date(a.timestamp).getTime() >= last24h);
    const decoded = audits.map((a) => ({ ...a, kind: classify(a) }));
    const recentDecoded = recent.map((a) => ({ ...a, kind: classify(a) }));

    const drift = decoded.filter((a) => a.kind === "veto" || a.kind === "human_review").length;
    const driftRecent = recentDecoded.filter((a) => a.kind === "veto" || a.kind === "human_review").length;

    return {
      totalPolicies: policies.length,
      activeCount: active.length,
      compliantPct,
      monitored24h: recent.length,
      drift,
      driftRecent,
      auditCoverage: audits.length ? 100 : 0,
      decoded,
    };
  }, [policies, audits]);

  const monitoringByAgent = useMemo(() => {
    const byAgent = new Map<string, { agent: string; requests: number; lastCheck: string; allow: number; veto: number; review: number }>();
    for (const a of audits) {
      const key = a.agent_id ?? "(unassigned)";
      const cur = byAgent.get(key) ?? { agent: key, requests: 0, lastCheck: a.timestamp, allow: 0, veto: 0, review: 0 };
      cur.requests += 1;
      if (a.timestamp > cur.lastCheck) cur.lastCheck = a.timestamp;
      const k = classify(a);
      if (k === "allow") cur.allow += 1;
      else if (k === "veto") cur.veto += 1;
      else cur.review += 1;
      byAgent.set(key, cur);
    }
    return Array.from(byAgent.values()).sort((a, b) => b.requests - a.requests).slice(0, 10);
  }, [audits]);

  const driftList = useMemo(
    () =>
      stats.decoded
        .filter((a) => a.kind === "veto" || a.kind === "human_review")
        .slice(0, 10),
    [stats.decoded]
  );

  const auditChart = useMemo(() => {
    const days: { day: string; events: number; coverage: number }[] = [];
    const now = new Date();
    const buckets = new Map<string, number>();
    for (const a of audits) {
      const d = new Date(a.timestamp);
      const k = d.toISOString().slice(0, 10);
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const events = buckets.get(k) ?? 0;
      days.push({ day: k.slice(5), events, coverage: events > 0 ? 100 : 0 });
    }
    const covered = days.filter((d) => d.coverage > 0).length;
    const coveragePct = Math.round((covered / 90) * 1000) / 10;
    const totalEvents = audits.length;
    return { days, coveragePct, totalEvents, gaps: 90 - covered };
  }, [audits]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Compliance Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading live registry & audit data…" : "Live data from Policy Registry + Veto Audit Log"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 space-y-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-success/30 bg-success/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Compliant Policies</CardTitle>
              <Shield className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.compliantPct}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeCount} active / {stats.totalPolicies} total
              </p>
            </CardContent>
          </Card>

          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Monitoring</CardTitle>
              <Activity className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.monitored24h.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Tool calls intercepted (24h)</p>
            </CardContent>
          </Card>

          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Policy Drift</CardTitle>
              <AlertTriangle className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.drift}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.driftRecent} in last 24h · vetoes + human review
              </p>
            </CardContent>
          </Card>

          <Card className="border-success/30 bg-success/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Audit Coverage</CardTitle>
              <AlertCircle className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{auditChart.coveragePct}%</div>
              <p className="text-xs text-muted-foreground mt-1">Days with logged events / 90</p>
            </CardContent>
          </Card>
        </div>

        {/* Policy Registry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-success" />
              Policy Registry
            </CardTitle>
            <CardDescription>All policies — compliant, superseded, or revoked</CardDescription>
          </CardHeader>
          <CardContent>
            {policies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No policies in registry yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((p) => {
                    const pct = p.compliance_pct ?? 100;
                    const cls =
                      p.status === "active"
                        ? "border-success text-success"
                        : p.status === "superseded"
                        ? "border-muted-foreground text-muted-foreground"
                        : "border-destructive text-destructive";
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-sm">{p.version}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.agent_id ?? "global"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-success" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm">{pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cls}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Active Monitoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-warning" />
              Active Monitoring (by agent)
            </CardTitle>
            <CardDescription>Top agents by intercepted tool calls</CardDescription>
          </CardHeader>
          <CardContent>
            {monitoringByAgent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No intercepted calls yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Allowed</TableHead>
                    <TableHead>Vetoed</TableHead>
                    <TableHead>Human Review</TableHead>
                    <TableHead>Last Check</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoringByAgent.map((m) => (
                    <TableRow key={m.agent}>
                      <TableCell className="font-mono text-sm">{m.agent}</TableCell>
                      <TableCell>{m.requests.toLocaleString()}</TableCell>
                      <TableCell className="text-success">{m.allow}</TableCell>
                      <TableCell className="text-destructive">{m.veto}</TableCell>
                      <TableCell className="text-warning">{m.review}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-success text-success">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(m.lastCheck).toLocaleString()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Policy Drift */}
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Policy Drift Detected
            </CardTitle>
            <CardDescription>Recent vetoes & human-review events from the audit log</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {driftList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drift events yet — all tool calls match an authorized policy.</p>
            ) : (
              driftList.map((d) => {
                const isReview = d.kind === "human_review";
                const cleanReason = (d.reason ?? "").replace(HR_PREFIX, "");
                return (
                  <Card key={d.id} className={isReview ? "border-warning/30 bg-warning/5" : "border-destructive/30 bg-destructive/5"}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {isReview ? (
                              <UserCheck className="h-4 w-4 text-warning" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="font-mono text-sm font-semibold">{d.id.slice(0, 8)}</span>
                            <Badge variant={isReview ? "secondary" : "destructive"}>
                              {isReview ? "human review" : "veto"}
                            </Badge>
                          </div>
                          <h4 className="font-semibold">{d.tool}</h4>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(d.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Reason: </span>
                          <span className="text-muted-foreground">{cleanReason}</span>
                        </div>
                        <div>
                          <span className="font-medium">Runtime PSH: </span>
                          <span className="hash-font text-xs text-muted-foreground break-all">
                            {d.runtime_hash}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Audit Coverage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-success" />
              Audit Trail Coverage — Last 90 Days
            </CardTitle>
            <CardDescription>Daily intercepted-call volume from the audit log</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ChartContainer
                config={{
                  events: { label: "Events Logged", color: "hsl(var(--warning))" },
                  coverage: { label: "Coverage %", color: "hsl(var(--success))" },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={auditChart.days}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line yAxisId="left" type="monotone" dataKey="events" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="coverage" stroke="hsl(var(--success))" strokeWidth={2} dot={false} opacity={0.5} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{auditChart.coveragePct}%</div>
                <div className="text-sm text-muted-foreground">Day Coverage (90d)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{auditChart.totalEvents.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Events Logged</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{auditChart.gaps}</div>
                <div className="text-sm text-muted-foreground">Days With No Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
