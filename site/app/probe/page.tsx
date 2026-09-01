"use client";

// T006 — throwaway probe harness for OQ (d)/(g). Runs nothing on mount; the
// operator clicks "Run probes" once, then copies the JSON blob back. Deleted
// at T008 close (docs/build-decisions.md records the removal so it does not
// read as a regression).
import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { useAppContext, useMarketplaceClient } from "@/components/providers/marketplace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DECLARED_KEYS,
  type OneShotResults,
  SDK_VERSIONS,
  runOneShotProbes,
} from "@/lib/probe/run-probes";

type SubscriptionLogEntry = {
  ts: string;
  source: "pages.context" | "pages.content.fieldsUpdated" | "pages.content.layoutUpdated";
  payload: unknown;
};

function tenantCandidate(appContext: unknown) {
  const ctx = appContext as {
    resourceAccess?: Array<{ resourceId?: string; tenantId?: string; tenantName?: string }>;
    MarketplaceAppTenantId?: string;
  } | null;
  const first = ctx?.resourceAccess?.[0];
  return {
    sitecoreContextId: first?.resourceId ?? null,
    tenantId: first?.tenantId ?? ctx?.MarketplaceAppTenantId ?? null,
    tenantName: first?.tenantName ?? null,
  };
}

export default function ProbePage() {
  const client = useMarketplaceClient();
  const appContext = useAppContext();

  const [running, setRunning] = useState(false);
  const [oneShot, setOneShot] = useState<OneShotResults | null>(null);
  const [subLog, setSubLog] = useState<SubscriptionLogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const subscribedRef = useRef(false);
  const unsubscribeFns = useRef<Array<() => void>>([]);

  const appendLog = useCallback((entry: Omit<SubscriptionLogEntry, "ts">) => {
    setSubLog((prev) => [...prev, { ...entry, ts: new Date().toISOString() }]);
  }, []);

  const startSubscriptions = useCallback(
    (sdkClient: ClientSDK) => {
      if (subscribedRef.current) return;
      subscribedRef.current = true;

      // (d) — does pages.context fire on every selection AND on in-canvas edits?
      client
        .query("pages.context", {
          subscribe: true,
          onSuccess: (payload) => appendLog({ source: "pages.context", payload }),
          onError: (error) =>
            appendLog({ source: "pages.context", payload: { error: String(error) } }),
        })
        .then((res) => {
          if (res.unsubscribe) unsubscribeFns.current.push(res.unsubscribe);
        });

      // (g) candidate — a field-level UPDATE event exists in SubscribeMap even
      // though no field SELECTOR exists in MutationMap. Evidence either way.
      unsubscribeFns.current.push(
        sdkClient.subscribe("pages.content.fieldsUpdated", {
          onData: (payload) => appendLog({ source: "pages.content.fieldsUpdated", payload }),
          onError: (error) =>
            appendLog({
              source: "pages.content.fieldsUpdated",
              payload: { error: String(error) },
            }),
        }),
      );
      unsubscribeFns.current.push(
        sdkClient.subscribe("pages.content.layoutUpdated", {
          onData: (payload) => appendLog({ source: "pages.content.layoutUpdated", payload }),
          onError: (error) =>
            appendLog({
              source: "pages.content.layoutUpdated",
              payload: { error: String(error) },
            }),
        }),
      );
    },
    [client, appendLog],
  );

  useEffect(() => {
    const fns = unsubscribeFns.current;
    return () => {
      for (const unsub of fns) unsub();
    };
  }, []);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setCopied(false);
    try {
      const results = await runOneShotProbes(client, appContext);
      setOneShot(results);
      startSubscriptions(client);
    } finally {
      setRunning(false);
    }
  }, [client, appContext, startSubscriptions]);

  const blob = {
    capturedAtUtc: new Date().toISOString(),
    sdkVersions: SDK_VERSIONS,
    declaredKeysTypeLevel: DECLARED_KEYS,
    tenant: tenantCandidate(appContext),
    applicationContextId: appContext?.id ?? null,
    oneShotResults: oneShot,
    pagesContextAndFieldSubscriptionLog: subLog,
  };
  const json = JSON.stringify(blob, null, 2);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
  }, [json]);

  return (
    <div className="p-4 space-y-4 text-sm">
      <Card>
        <CardHeader>
          <CardTitle>Link Health Lens — probe harness (throwaway, T006)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">
            Click once. Then edit a field or select a different page in the canvas to grow the
            subscription log, and copy the blob back.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleRun} disabled={running}>
              {running ? "Running…" : oneShot ? "Re-run probes" : "Run probes"}
            </Button>
            <Button onClick={handleCopy} disabled={!oneShot} variant="outline">
              {copied ? "Copied" : "Copy JSON"}
            </Button>
          </div>
          <pre className="select-all whitespace-pre-wrap break-all rounded bg-muted p-3 text-xs">
            {json}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
