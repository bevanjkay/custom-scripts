#!/usr/bin/env node
import { fetchReferenceContent } from "youversion-suggest";

interface Reference {
  name: string;
  version: { name: string };
  content?: string;
}

export const formatReference = ({ name, version, content }: Reference) =>
  `${name} (${version.name})\n${content ?? ""}`;

async function main() {
  const input = process.argv.slice(2).join(" ");

  if (!input) {
    console.error('Usage: bible <reference>, e.g. bible "John 3:16"');
    process.exit(1);
  }

  try {
    const reference = await fetchReferenceContent(input, {
      language: "eng",
      fallbackVersion: "nlt",
    });
    console.log(formatReference(reference));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : error;
    console.error("Query:", input, " | Error:", message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
