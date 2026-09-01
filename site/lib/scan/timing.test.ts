// T033 RED — logScanTiming. Console-only (NFR-3); asserts the message names
// the page, the anchor count and the elapsed time, since that is the whole
// point of the instrumentation.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logScanTiming } from "./timing";

describe("logScanTiming", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it("logs the page name, anchor count and elapsed ms — console only, nothing sent anywhere", () => {
    logScanTiming("Zephira Home", 57, 1234.2);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [message] = infoSpy.mock.calls[0] as [string];
    expect(message).toContain("Zephira Home");
    expect(message).toContain("57");
    expect(message).toContain("1234ms");
  });
});
