import process from "node:process";

// The `fluro` package logs debug output with `console.log` and triggers
// Node warnings, so this must be imported before it.
export const print = console.log;
console.log = () => {};
process.emitWarning = () => {};
