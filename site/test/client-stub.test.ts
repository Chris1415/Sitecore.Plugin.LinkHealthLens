// Proves the test stack + typed SDK stub compile and run (T004). Real scan/panel
// tests land in their own tranches; this is the harness self-check.
import { describe, expect, it } from "vitest";
import { createStubClient } from "./client-stub";

describe("createStubClient", () => {
  it("stubs query/mutate/subscribe/destroy as callable mocks", () => {
    const { stubClient, query } = createStubClient();
    expect(typeof stubClient.query).toBe("function");
    expect(typeof stubClient.mutate).toBe("function");
    expect(typeof stubClient.subscribe).toBe("function");
    expect(typeof stubClient.destroy).toBe("function");
    expect(query).not.toHaveBeenCalled();
  });
});
