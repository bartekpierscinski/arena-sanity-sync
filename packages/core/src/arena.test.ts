import { describe, it, expect, vi, afterEach } from "vitest";
import { createArenaClient, ArenaApiError } from "./arena.js";

function jsonResponse(body: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

const rlHeaders = {
  "x-ratelimit-limit": "100",
  "x-ratelimit-remaining": "99",
  "x-ratelimit-tier": "standard",
  "x-ratelimit-window": "60",
  "x-ratelimit-reset": "0",
};

describe("createArenaClient (v3)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("getChannelPage parses v3 { data, meta } format", async () => {
    const blocks = [{ id: 1, title: "A" }, { id: 2, title: "B" }];
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        data: blocks,
        meta: { current_page: 1, total_pages: 3, total_count: 30, per: 10, has_more_pages: true },
      }, 200, rlHeaders),
    );

    const client = createArenaClient({ accessToken: "tok" });
    const res = await client.getChannelPage("my-channel", { page: 1, per: 10 });

    expect(res.contents).toEqual(blocks);
    expect(res.total_pages).toBe(3);
  });

  it("getChannelInfo returns channel title", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse({ title: "Cool Channel" }, 200, rlHeaders),
    );

    const client = createArenaClient({ accessToken: "tok" });
    const res = await client.getChannelInfo!("cool-channel");
    expect(res.title).toBe("Cool Channel");
  });

  it("constructs correct URL with encoded slug", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: [], meta: { current_page: 1, total_pages: 1, total_count: 0, per: 10, has_more_pages: false } }, 200, rlHeaders),
    );
    globalThis.fetch = fetchMock;

    const client = createArenaClient({ accessToken: "tok" });
    await client.getChannelPage("my channel/slug", { page: 1, per: 10 });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/channels/my%20channel%2Fslug/contents");
    expect(url).toContain("page=1");
    expect(url).toContain("per=10");
  });

  it("sends Authorization: Bearer header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ title: "T" }, 200, rlHeaders),
    );
    globalThis.fetch = fetchMock;

    const client = createArenaClient({ accessToken: "secret-token" });
    await client.getChannelInfo!("ch");

    const opts = fetchMock.mock.calls[0][1] as RequestInit;
    expect(opts.headers).toEqual({ Authorization: "Bearer secret-token" });
  });

  it("v3 error responses throw ArenaApiError", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse({ error: "Not Found", code: "not_found", details: "No such channel" }, 404),
    );

    const client = createArenaClient({ accessToken: "tok" });
    await expect(client.getChannelInfo!("bad")).rejects.toThrow(ArenaApiError);

    try {
      globalThis.fetch = vi.fn().mockResolvedValueOnce(
        jsonResponse({ error: "Not Found", code: "not_found", details: "No such channel" }, 404),
      );
      await client.getChannelInfo!("bad");
    } catch (e: any) {
      expect(e).toBeInstanceOf(ArenaApiError);
      expect(e.status).toBe(404);
      expect(e.code).toBe("not_found");
      expect(e.details).toBe("No such channel");
    }
  });

  it("429 triggers retry using X-RateLimit-Reset", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: "Rate limited", code: "rate_limited" }, 429, {
          ...rlHeaders,
          "x-ratelimit-reset": "0", // reset immediately
          "x-ratelimit-remaining": "0",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ title: "OK" }, 200, rlHeaders),
      );
    globalThis.fetch = fetchMock;

    const client = createArenaClient({ accessToken: "tok" });
    const promise = client.getChannelInfo!("ch");

    await vi.advanceTimersByTimeAsync(5000);

    const res = await promise;
    expect(res.title).toBe("OK");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("429 gives up after 3 retries", async () => {
    vi.useFakeTimers();

    const rateResp = () =>
      jsonResponse({ error: "Rate limited", code: "rate_limited" }, 429, {
        ...rlHeaders,
        "x-ratelimit-reset": "0",
        "x-ratelimit-remaining": "0",
      });

    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(rateResp())
      .mockResolvedValueOnce(rateResp())
      .mockResolvedValueOnce(rateResp())
      .mockResolvedValueOnce(rateResp());

    const client = createArenaClient({ accessToken: "tok" });
    // Attach rejection handler immediately to avoid unhandled rejection
    const promise = client.getChannelInfo!("ch").catch((e: any) => e);

    // Advance through all retry delays
    await vi.advanceTimersByTimeAsync(20_000);

    const err = await promise;
    expect(err).toBeInstanceOf(ArenaApiError);
    expect(err.message).toBe("Rate limited after max retries");
    vi.useRealTimers();
  });

  it("onRateLimit callback receives parsed headers", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse({ title: "T" }, 200, {
        "x-ratelimit-limit": "200",
        "x-ratelimit-remaining": "150",
        "x-ratelimit-tier": "premium",
        "x-ratelimit-window": "120",
        "x-ratelimit-reset": "1700000000",
      }),
    );

    const onRateLimit = vi.fn();
    const client = createArenaClient({ accessToken: "tok", onRateLimit });
    await client.getChannelInfo!("ch");

    expect(onRateLimit).toHaveBeenCalledOnce();
    expect(onRateLimit).toHaveBeenCalledWith({
      limit: 200,
      remaining: 150,
      tier: "premium",
      windowSec: 120,
      resetAt: 1700000000,
    });
  });

  it("custom baseUrl option works", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ title: "T" }, 200, rlHeaders),
    );
    globalThis.fetch = fetchMock;

    const client = createArenaClient({
      accessToken: "tok",
      baseUrl: "https://custom.api.example.com/v3",
    });
    await client.getChannelInfo!("ch");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url.startsWith("https://custom.api.example.com/v3/channels/")).toBe(true);
  });

  it("network errors propagate (not swallowed)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed"));

    const client = createArenaClient({ accessToken: "tok" });
    await expect(client.getChannelInfo!("ch")).rejects.toThrow("fetch failed");
  });
});
