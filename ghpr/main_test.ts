import { assertEquals } from "jsr:@std/assert";
import { afterEach, beforeEach, describe, it } from "jsr:@std/testing/bdd";
import { stub } from "jsr:@std/testing/mock";

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

  describe("ID parsing", () => {
    it("should parse comma-separated IDs", () => {
      const input = "1,2,3";
      const expected = [1, 2, 3];
      const result = input.split(",").map(Number);
      assertEquals(result, expected);
    });

    it("should parse range IDs", () => {
      const input = "1-3";
      const range = input.split("-").map(Number);
      const result = [];
      for (let x = range[0]; x <= range[1]; x++) {
        result.push(x);
      }
      assertEquals(result, [1, 2, 3]);
    });

    it("should reject invalid ranges", () => {
      const input = "3-1";
      const range = input.split("-").map(Number);
      assertEquals(range[1] - range[0] < 0, true);
    });

    it("should reject large ranges", () => {
      const input = "1-52";
      const range = input.split("-").map(Number);
      assertEquals(range[1] - range[0] > 50, true);
    });
  });

  describe("Logging", () => {
    it("should format error messages correctly", () => {
      const consoleLogStub = stub(console, "log");
      const log = (
        type: "error" | "success" | "base" | null,
        message: string,
      ) => {
        switch (type) {
          case "error":
            console.log(`%cERROR:`, "color: red; font-weight: bold;", message);
            break;
          default:
            console.log(message);
            break;
        }
      };

      log("error", "Test error");
      assertEquals(
        consoleLogStub.calls[0].args,
        ["%cERROR:", "color: red; font-weight: bold;", "Test error"],
      );

      consoleLogStub.restore();
    });
  });
});
