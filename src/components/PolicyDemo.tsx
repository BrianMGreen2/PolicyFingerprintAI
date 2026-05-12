import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Hash, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import canonicalize from "canonicalize";

const samplePolicy = `{
  "schema_version": "1.0",
  "policy_components": {
    "guardrails": ["no_pii", "content_filter"],
    "rubric": "enterprise_compliance_v2",
    "timestamp": "2025-10-25T15:40:00Z"
  },
  "hash_algo": "SHA-256"
}`;

const PolicyDemo = () => {
  const [policyText, setPolicyText] = useState(samplePolicy);
  const [hash, setHash] = useState("");
  const [copied, setCopied] = useState(false);
  const [isHashing, setIsHashing] = useState(false);

  const generateHash = async () => {
    setIsHashing(true);
    try {
      // 1. Parse the policy bundle JSON
      const parsed = JSON.parse(policyText);

      // 2. Canonicalize per RFC 8785 (JCS) — deterministic JSON
      const canonical = canonicalize(parsed);
      if (!canonical) throw new Error("Canonicalization failed");

      // 3. SHA-256 digest via Web Crypto API
      const encoded = new TextEncoder().encode(canonical);
      const digest = await crypto.subtle.digest("SHA-256", encoded);
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setHash(hex);
      toast.success("Policy Fingerprint generated!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid JSON";
      toast.error(`Hashing failed: ${msg}`);
      setHash("");
    } finally {
      setIsHashing(false);
    }
  };

  const copyHash = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    toast.success("Hash copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 bg-card/30">
      <div className="container px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Try the <span className="text-gradient-teal">Interactive Demo</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              See how your policy configurations become cryptographic fingerprints
            </p>
          </div>

          <Card className="p-8 bg-card border-border">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  Policy Configuration (JSON)
                </label>
                <Textarea
                  value={policyText}
                  onChange={(e) => setPolicyText(e.target.value)}
                  className="font-mono text-sm min-h-[200px] bg-background border-border"
                  placeholder="Enter your policy JSON..."
                />
              </div>

              <Button
                onClick={generateHash}
                disabled={isHashing}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-teal"
                size="lg"
              >
                {isHashing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Canonicalizing & Hashing...
                  </>
                ) : (
                  <>
                    <Hash className="mr-2 h-5 w-5" />
                    Canonicalize & Hash
                  </>
                )}
              </Button>

              {hash && (
                <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-500">
                  <label className="block text-sm font-medium text-secondary">
                    Policy Fingerprint (SHA-256):
                  </label>
                  <div className="relative">
                    <div className="hash-font p-4 bg-background border border-primary/30 rounded-lg break-all text-primary">
                      {hash}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={copyHash}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span>Ready to add to Daily Merkle batch</span>
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

export default PolicyDemo;
