#!/usr/bin/env node
import { getPlans } from "./fluro.ts";
import { findSongs, removeHTML } from "./utils.ts";
import type { Plan } from "./types.ts";

const songName = process.argv[2];
const token = process.env.FLURO_TOKEN;

if (!songName) {
  console.error("Please provide a song name to search for.");
  console.error("Usage: fluro-songs <song name>");
  process.exit(1);
}

if (!token) {
  console.error("Please provide FLURO_TOKEN in the environment");
  process.exit(1);
}

let plans: Plan[];
try {
  plans = await getPlans(token);
} catch (err) {
  console.error("Error fetching plans", (err as Error).message);
  process.exit(1);
}

for (const schedule of findSongs(plans, songName)) {
  const notes = schedule.notes || {};
  console.log(
    schedule.title,
    schedule.key,
    removeHTML(notes["Person Responsible"]),
  );
}
