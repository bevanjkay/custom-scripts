import { assert, assertEquals, assertRejects } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";
import { fetchReferenceContent } from "npm:youversion-suggest";

describe("Bible Reference Tests", () => {
  it("should fetch valid bible reference", async () => {
    const input = "John 3:16";
    const reference = await fetchReferenceContent(input, {
      language: "eng",
      fallbackVersion: "nlt",
    });

    assertEquals(typeof reference.name, "string");
    assertEquals(typeof reference.version.name, "string");
    assertEquals(typeof reference.content, "string");
    assertEquals((reference.content as string).length > 0, true);
  });
});
