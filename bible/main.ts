import { fetchReferenceContent } from "youversion-suggest";

const input = Deno.args.slice(2).join(" ");

if (!input) {
    Deno.exit();
}

try {

    const reference = await fetchReferenceContent(input, {
        language: "eng", // Optional (default: 'eng')
        fallbackVersion: "nlt" // Optional (default: 'niv')
        // includeVerseNumbers: true // Optional (default: false)
        // includeLineBreaks: false // Optional (default: true)
    });

    const output = `${reference.name} (${reference.version.name})\n${reference.content}`
    console.log(output);
} catch (error) {
    console.error("Query:", input, " | Error:", error.message);
    Deno.exit();
}

