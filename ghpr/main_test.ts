import { assertEquals, assertThrows } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { stub } from "@std/testing/mock";
import { log, parseIds } from "./main.ts";

describe("GHPR Tests", () => {
  const originalEnv = Deno.env.get("GITHUB_TOKEN");
  const mockToken = "mock-token";

  beforeEach(() => {
    Deno.env.set("GITHUB_TOKEN", mockToken);
  });

  afterEach(() => {
    if (originalEnv) {
      Deno.env.set("GITHUB_TOKEN", originalEnv);
    } else {
      Deno.env.delete("GITHUB_TOKEN");
    }
  });

  describe("parseIds", () => {
    it("parses a single ID", () => {
      assertEquals(parseIds("42"), [42]);
    });

    it("parses comma-separated IDs", () => {
      assertEquals(parseIds("1,2,3"), [1, 2, 3]);
    });

    it("parses an inclusive range", () => {
      assertEquals(parseIds("1-3"), [1, 2, 3]);
    });

    it("parses a start+count range", () => {
      assertEquals(parseIds("1+3"), [1, 2, 3, 4]);
    });

    it("rejects a backwards range", () => {
      assertThrows(() => parseIds("3-1"), Error, "Invalid range");
    });

    it("rejects a range larger than 50", () => {
      assertThrows(() => parseIds("1-52"), Error, "too large");
    });

    it("rejects a start+count larger than 25", () => {
      assertThrows(() => parseIds("1+26"), Error, "too large");
    });

    it("rejects non-numeric input", () => {
      assertThrows(() => parseIds("abc"), Error, "Invalid PR ID");
    });
  });

  describe("log", () => {
    it("formats error messages correctly", () => {
      const consoleLogStub = stub(console, "log");
      try {
        log("error", "Test error");
        assertEquals(
          consoleLogStub.calls[0].args,
          ["%cERROR:", "color: red; font-weight: bold;", "Test error"],
        );
      } finally {
        consoleLogStub.restore();
      }
    });

    it("passes plain messages through for base/null", () => {
      const consoleLogStub = stub(console, "log");
      try {
        log("base", "hello");
        log(null, "world");
        assertEquals(consoleLogStub.calls[0].args, ["hello"]);
        assertEquals(consoleLogStub.calls[1].args, ["world"]);
      } finally {
        consoleLogStub.restore();
      }
    });
  });
});
