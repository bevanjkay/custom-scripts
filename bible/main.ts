import { fetchReferenceContent } from "npm:youversion-suggest";

const input = Deno.args.join(" ");

if (!input) {
  Deno.exit();
}

try {
  const reference = await fetchReferenceContent(input, {
    language: "eng", // Optional (default: 'eng')
    fallbackVersion: "nlt", // Optional (default: 'niv')
    // includeVerseNumbers: true // Optional (default: false)
    // includeLineBreaks: false // Optional (default: true)
  });

  const output =
    `${reference.name} (${reference.version.name})\n${reference.content}`;
  console.log(output);
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error("Query:", input, " | Error:", error.message);
  } else {
    console.error("Query:", input, " | Error:", error);
  }
  Deno.exit();
}
