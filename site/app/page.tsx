// Root route. This app declares exactly ONE extension point —
// `xmc:pages:contextpanel` at `/pages-context` (ADR-0004) — so `/` is not a
// product surface and renders nothing but an orientation line.
//
// It previously rendered the scaffold's demo page, which dumped the whole
// `application.context` (both Sitecore context ids) into the DOM and read the
// context id with an `as string` cast: docs/build-decisions.md#root-route-is-not-a-surface
export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "var(--font-geist-sans), sans-serif" }}>
      <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Link Health Lens</h1>
      <p style={{ marginTop: "0.5rem", opacity: 0.7 }}>
        This app runs as a context panel inside Sitecore Pages. There is nothing to see here.
      </p>
    </main>
  );
}
