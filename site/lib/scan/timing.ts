// T033 — M1 instrumentation. In-memory only, developer-console only: no
// telemetry, no persistence, no cookies (NFR-3). Records page-selection-event
// → complete-finding-list elapsed time so a real-tenant run over the named
// sample can report worst-observed (§ 8 — a percentile isn't computable from
// a small sample, which is why M1 is worst-observed).
export function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function logScanTiming(pageName: string, anchorCount: number, elapsedMs: number): void {
  console.info(`[link-health-lens] scan complete: ${pageName} — ${anchorCount} anchors — ${elapsedMs.toFixed(0)}ms`);
}
