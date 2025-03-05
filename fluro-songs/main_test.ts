import { assertEquals } from "jsr:@std/assert";
import { afterEach, beforeEach, describe, it } from "jsr:@std/testing/bdd";
import { removeHTML } from "./utils.ts";
import type { Plan } from "./types.ts";

describe("Fluro Songs Tests", () => {
  const originalEnv = {
    FLURO_ACCOUNT: Deno.env.get("FLURO_ACCOUNT"),
    FLURO_USERNAME: Deno.env.get("FLURO_USERNAME"),
    FLURO_PASSWORD: Deno.env.get("FLURO_PASSWORD"),
  };

  beforeEach(() => {
    Deno.env.set("FLURO_ACCOUNT", "test-account");
    Deno.env.set("FLURO_USERNAME", "test-user");
    Deno.env.set("FLURO_PASSWORD", "test-pass");
  });

  afterEach(() => {
    if (originalEnv.FLURO_ACCOUNT) {
      Deno.env.set("FLURO_ACCOUNT", originalEnv.FLURO_ACCOUNT);
    } else {
      Deno.env.delete("FLURO_ACCOUNT");
    }
    if (originalEnv.FLURO_USERNAME) {
      Deno.env.set("FLURO_USERNAME", originalEnv.FLURO_USERNAME);
    } else {
      Deno.env.delete("FLURO_USERNAME");
    }
    if (originalEnv.FLURO_PASSWORD) {
      Deno.env.set("FLURO_PASSWORD", originalEnv.FLURO_PASSWORD);
    } else {
      Deno.env.delete("FLURO_PASSWORD");
    }
  });

  describe("HTML Removal", () => {
    it("should remove HTML tags", () => {
      const input = "<p>Test content</p><br/><div>More content</div>";
      const expected = "Test contentMore content";
      assertEquals(removeHTML(input), expected);
    });

    it("should handle empty input", () => {
      assertEquals(removeHTML(""), "");
    });

    it("should handle input without HTML", () => {
      const input = "Plain text content";
      assertEquals(removeHTML(input), input);
    });
  });

  describe("Plan Processing", () => {
    it("should filter plans by song name", () => {
      const mockPlans: Plan[] = [
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
      ];

      const songName = "Grace";
      const matchingSchedules = mockPlans[0].schedules.filter((schedule) =>
        schedule.title.match(new RegExp(songName, "i"))
      );

      assertEquals(matchingSchedules.length, 1);
      assertEquals(matchingSchedules[0].title, "Amazing Grace");
    });
  });
});
