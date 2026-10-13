import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatReference } from "./main.ts";

describe("formatReference", () => {
  it("prints the reference and version above the passage", () => {
    assert.equal(
      formatReference({
        name: "John 3:16",
        version: { name: "NLT" },
        content: "For this is how God loved the world",
      }),
      "John 3:16 (NLT)\nFor this is how God loved the world",
    );
  });
});
