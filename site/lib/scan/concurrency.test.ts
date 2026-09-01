// T029 RED — mapWithConcurrency.
import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("preserves result order regardless of completion order", async () => {
    const delays = [30, 10, 20, 5];
    const result = await mapWithConcurrency(delays, 2, (ms) => new Promise((resolve) => setTimeout(() => resolve(ms), ms)));
    expect(result).toEqual(delays);
  });

  it("never runs more than `limit` concurrently", async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 12 }, (_, i) => i);

    await mapWithConcurrency(items, 3, async (i) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return i;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it("handles an empty input without invoking the worker", async () => {
    let calls = 0;
    const result = await mapWithConcurrency([], 4, async () => {
      calls++;
    });
    expect(result).toEqual([]);
    expect(calls).toBe(0);
  });
});
