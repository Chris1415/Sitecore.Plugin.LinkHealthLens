// T019 — M2 anchor-coverage reconciliation. Pairs the extractor's output
// against an INDEPENDENT anchor query by href + document ordinal (the row
// identity, § 4c-6). A matching total COUNT is not a reconciliation — this
// pairs individually and names every unmatched row on both sides.
export interface AnchorRef {
  href: string;
  ordinal: number;
}

export interface ReconciliationReport {
  matched: number;
  unmatchedExtracted: AnchorRef[];
  unmatchedIndependent: AnchorRef[];
  isFullMatch: boolean;
}

const keyOf = (a: AnchorRef) => `${a.ordinal}::${a.href}`;

export function reconcileAnchors(
  extracted: AnchorRef[],
  independent: AnchorRef[],
): ReconciliationReport {
  const remaining = new Map(independent.map((a) => [keyOf(a), a]));
  const unmatchedExtracted: AnchorRef[] = [];
  let matched = 0;

  for (const row of extracted) {
    const key = keyOf(row);
    if (remaining.has(key)) {
      matched += 1;
      remaining.delete(key);
    } else {
      unmatchedExtracted.push(row);
    }
  }

  const unmatchedIndependent = Array.from(remaining.values());

  return {
    matched,
    unmatchedExtracted,
    unmatchedIndependent,
    isFullMatch: unmatchedExtracted.length === 0 && unmatchedIndependent.length === 0,
  };
}
