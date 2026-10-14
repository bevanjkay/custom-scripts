import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { errorMessage, getPlans } from "./fluro.ts";
import { findSongs, removeHTML } from "./utils.ts";
import type { Plan } from "./types.ts";

describe("removeHTML", () => {
  it("removes HTML tags", () => {
    const input = "<p>Test content</p><br/><div>More content</div>";
    assert.equal(removeHTML(input), "Test contentMore content");
  });

  it("decodes common HTML entities", () => {
    assert.equal(
      removeHTML(
        "<p>Tom &amp; Jerry&nbsp;&lt;3 &quot;hi&quot; &#39;x&#39;</p>",
      ),
      `Tom & Jerry <3 "hi" 'x'`,
    );
  });

  it("handles empty input", () => {
    assert.equal(removeHTML(""), "");
  });

  it("handles input without HTML", () => {
    assert.equal(removeHTML("Plain text content"), "Plain text content");
  });
});

describe("findSongs", () => {
  const plans: Plan[] = [
    {
      schedules: [
        {
          title: "Amazing Grace",
          key: "G",
          notes: { "Person Responsible": "John" },
        },
        {
          title: "How Great Thou Art",
          key: "D",
          notes: { "Person Responsible": "Jane" },
        },
      ],
    },
    {},
  ];

  it("matches schedule titles case-insensitively", () => {
    assert.deepEqual(
      findSongs(plans, "GRACE").map((s) => s.title),
      ["Amazing Grace"],
    );
  });

  it("skips plans without schedules", () => {
    assert.deepEqual(findSongs([{}], "grace"), []);
  });
});

describe("getPlans", () => {
  afterEach(() => mock.restoreAll());

  it("fetches plans with the token", async () => {
    const fetchMock = mock.method(globalThis, "fetch", () =>
      Promise.resolve(new Response(JSON.stringify([{ schedules: [] }]))),
    );
    assert.deepEqual(await getPlans("abc"), [{ schedules: [] }]);
    const [url, init] = fetchMock.mock.calls[0].arguments;
    assert.equal(url, "https://api.fluro.io/content/plan");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer abc");
  });

  it("throws the API error message", async () => {
    mock.method(globalThis, "fetch", () =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "Invalid token" }), {
          status: 401,
        }),
      ),
    );
    await assert.rejects(getPlans("bad"), /Invalid token/);
  });
});

describe("errorMessage", () => {
  it("prefers a JSON message", () => {
    assert.equal(errorMessage(401, '{"message":"Nope"}'), "Nope");
  });

  it("uses a JSON string body", () => {
    assert.equal(errorMessage(400, '"Bad request"'), "Bad request");
  });

  it("uses a plain-text body", () => {
    assert.equal(errorMessage(502, "Bad Gateway"), "Bad Gateway");
  });

  it("falls back to the status", () => {
    assert.equal(errorMessage(500, ""), "HTTP 500");
  });
});
