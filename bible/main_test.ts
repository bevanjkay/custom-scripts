import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { formatReference } from "./main.ts";

describe("formatReference", () => {
  it("prints the reference and version above the passage", () => {
    assertEquals(
      formatReference({
        name: "John 3:16",
        version: { name: "NLT" },
        content: "For this is how God loved the world",
      }),
      "John 3:16 (NLT)\nFor this is how God loved the world",
    );
  });
});
