import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { findSongs, removeHTML } from "./utils.ts";
import type { Plan } from "./types.ts";

describe("removeHTML", () => {
  it("removes HTML tags", () => {
    const input = "<p>Test content</p><br/><div>More content</div>";
    assertEquals(removeHTML(input), "Test contentMore content");
  });

  it("decodes common HTML entities", () => {
    assertEquals(
      removeHTML(
        "<p>Tom &amp; Jerry&nbsp;&lt;3 &quot;hi&quot; &#39;x&#39;</p>",
      ),
      `Tom & Jerry <3 "hi" 'x'`,
    );
  });

  it("handles empty input", () => {
    assertEquals(removeHTML(""), "");
  });

  it("handles input without HTML", () => {
    assertEquals(removeHTML("Plain text content"), "Plain text content");
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
    assertEquals(findSongs(plans, "GRACE").map((s) => s.title), [
      "Amazing Grace",
    ]);
  });

  it("skips plans without schedules", () => {
    assertEquals(findSongs([{}], "grace"), []);
  });
});
