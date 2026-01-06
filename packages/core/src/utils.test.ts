import { describe, it, expect } from "vitest";
import {
  delay,
  sanitizeObjectForSanity,
  pruneArenaRaw,
  buildImageSignature,
  computeFingerprint,
  ensureKeys,
  channelsEqual,
  mergeChannels,
} from "./utils.js";

describe("delay", () => {
  it("should resolve after specified time", async () => {
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });
});

describe("sanitizeObjectForSanity", () => {
  it("should replace invalid characters in keys", () => {
    const input = { "invalid.key": "value", "another/key": 123 };
    const result = sanitizeObjectForSanity(input);
    expect(result).toEqual({ invalid_key: "value", another_key: 123 });
  });

  it("should handle nested objects", () => {
    const input = { outer: { "inner.key": "value" } };
    const result = sanitizeObjectForSanity(input);
    expect(result).toEqual({ outer: { inner_key: "value" } });
  });

  it("should handle arrays", () => {
    const input = [{ "arr.key": "value" }];
    const result = sanitizeObjectForSanity(input);
    expect(result).toEqual([{ arr_key: "value" }]);
  });

  it("should return null/undefined as-is", () => {
    expect(sanitizeObjectForSanity(null)).toBeNull();
    expect(sanitizeObjectForSanity(undefined)).toBeUndefined();
  });

  it("should handle primitive values", () => {
    expect(sanitizeObjectForSanity("string")).toBe("string");
    expect(sanitizeObjectForSanity(123)).toBe(123);
    expect(sanitizeObjectForSanity(true)).toBe(true);
  });
});

describe("pruneArenaRaw", () => {
  it("should remove metadata and embed fields", () => {
    const block = { id: 1, title: "Test", metadata: { foo: "bar" }, embed: { html: "<>" } };
    const result = pruneArenaRaw(block);
    expect(result).toEqual({ id: 1, title: "Test" });
    expect(result.metadata).toBeUndefined();
    expect(result.embed).toBeUndefined();
  });

  it("should preserve other fields", () => {
    const block = { id: 1, title: "Test", description: "Desc" };
    const result = pruneArenaRaw(block);
    expect(result).toEqual({ id: 1, title: "Test", description: "Desc" });
  });
});

describe("buildImageSignature", () => {
  it("should build signature from original image url and size", () => {
    const block = {
      image: { original: { url: "https://example.com/img.jpg", file_size: 12345 } },
    };
    const result = buildImageSignature(block);
    expect(result).toBe("https://example.com/img.jpg|12345");
  });

  it("should return null if no image", () => {
    expect(buildImageSignature({})).toBeNull();
    expect(buildImageSignature({ image: {} })).toBeNull();
    expect(buildImageSignature({ image: { original: {} } })).toBeNull();
  });

  it("should handle missing file_size", () => {
    const block = { image: { original: { url: "https://example.com/img.jpg" } } };
    const result = buildImageSignature(block);
    expect(result).toBe("https://example.com/img.jpg|");
  });
});

describe("computeFingerprint", () => {
  it("should return base64 encoded fingerprint", () => {
    const block = { id: 1, title: "Test", class: "Text", updated_at: "2024-01-01" };
    const result = computeFingerprint(block);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("should produce consistent fingerprints for same input", () => {
    const block = { id: 1, title: "Test", class: "Text", updated_at: "2024-01-01" };
    const result1 = computeFingerprint(block);
    const result2 = computeFingerprint(block);
    expect(result1).toBe(result2);
  });

  it("should produce different fingerprints for different input", () => {
    const block1 = { id: 1, title: "Test", class: "Text", updated_at: "2024-01-01" };
    const block2 = { id: 2, title: "Test", class: "Text", updated_at: "2024-01-01" };
    const result1 = computeFingerprint(block1);
    const result2 = computeFingerprint(block2);
    expect(result1).not.toBe(result2);
  });
});

describe("channelsEqual", () => {
  it("should return true for equal arrays", () => {
    const a = [{ slug: "ch1", title: "Channel 1" }];
    const b = [{ slug: "ch1", title: "Channel 1" }];
    expect(channelsEqual(a, b)).toBe(true);
  });

  it("should return false for different lengths", () => {
    const a = [{ slug: "ch1", title: "Channel 1" }];
    const b: any[] = [];
    expect(channelsEqual(a, b)).toBe(false);
  });

  it("should return false for different slugs", () => {
    const a = [{ slug: "ch1", title: "Channel 1" }];
    const b = [{ slug: "ch2", title: "Channel 1" }];
    expect(channelsEqual(a, b)).toBe(false);
  });

  it("should return false for different titles", () => {
    const a = [{ slug: "ch1", title: "Channel 1" }];
    const b = [{ slug: "ch1", title: "Channel 2" }];
    expect(channelsEqual(a, b)).toBe(false);
  });

  it("should return false for non-arrays", () => {
    expect(channelsEqual(null as any, [])).toBe(false);
    expect(channelsEqual([], null as any)).toBe(false);
  });
});

describe("ensureKeys", () => {
  it("should add _key to items without one", () => {
    const input = [{ slug: "test", _key: undefined }] as { slug: string; _key?: string }[];
    const result = ensureKeys(input);
    expect(result[0]._key).toBeTruthy();
    expect(result[0].slug).toBe("test");
  });

  it("should preserve existing _key", () => {
    const input = [{ slug: "test", _key: "existing" }] as { slug: string; _key?: string }[];
    const result = ensureKeys(input);
    expect(result[0]._key).toBe("existing");
  });

  it("should handle empty array", () => {
    const result = ensureKeys([]);
    expect(result).toEqual([]);
  });

  it("should handle undefined", () => {
    const result = ensureKeys(undefined);
    expect(result).toEqual([]);
  });
});

describe("mergeChannels", () => {
  it("should merge existing and new channels", () => {
    const existing = [{ slug: "ch1", title: "Channel 1", _key: "k1" }];
    const fromArena = [{ slug: "ch2", title: "Channel 2" }];
    const channelMap = new Map([
      ["ch1", "Channel 1"],
      ["ch2", "Channel 2"],
    ]);

    const result = mergeChannels(existing, fromArena, channelMap);

    expect(result.length).toBe(2);
    expect(result[0].slug).toBe("ch1");
    expect(result[1].slug).toBe("ch2");
  });

  it("should preserve existing channel order", () => {
    const existing = [
      { slug: "ch2", title: "Channel 2", _key: "k2" },
      { slug: "ch1", title: "Channel 1", _key: "k1" },
    ];
    const fromArena = [{ slug: "ch3", title: "Channel 3" }];
    const channelMap = new Map([
      ["ch1", "Channel 1"],
      ["ch2", "Channel 2"],
      ["ch3", "Channel 3"],
    ]);

    const result = mergeChannels(existing, fromArena, channelMap);

    expect(result[0].slug).toBe("ch2");
    expect(result[1].slug).toBe("ch1");
    expect(result[2].slug).toBe("ch3");
  });

  it("should update title from channelMap", () => {
    const existing = [{ slug: "ch1", title: "Old Title", _key: "k1" }];
    const fromArena = [{ slug: "ch1", title: "Arena Title" }];
    const channelMap = new Map([["ch1", "New Title"]]);

    const result = mergeChannels(existing, fromArena, channelMap);

    expect(result[0].title).toBe("New Title");
  });

  it("should handle empty inputs", () => {
    const channelMap = new Map();
    expect(mergeChannels([], [], channelMap)).toEqual([]);
    expect(mergeChannels(undefined, [], channelMap)).toEqual([]);
  });
});
