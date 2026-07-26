import Fluro from "fluro";
import { removeHTML } from "./utils.ts";
import type { FluroResponse, Plan } from "./types.ts";

const fluro = new Fluro({
  apiURL: "https://api.fluro.io",
});

const songName = Deno.args[0];

const accountID = Deno.env.get("FLURO_ACCOUNT");
const username = Deno.env.get("FLURO_USERNAME");
const password = Deno.env.get("FLURO_PASSWORD");

if (!songName) {
  console.error("Please provide a song name to search for.");
  console.error("Usage: fluro-songs <song name>");
  Deno.exit(1);
}

if (!accountID || !username || !password) {
  console.error(
    "Please provide FLURO_ACCOUNT, FLURO_USERNAME and FLURO_PASSWORD in the environment",
  );
  Deno.exit(1);
}

async function login() {
  try {
    await fluro.auth.login({ username, password });
    await fluro.auth.changeAccount(accountID);
  } catch (err) {
    console.error("Authentication Failed", fluro.utils.errorMessage(err));
    Deno.exit(1);
  }
}

async function getPlans(): Promise<Plan[]> {
  try {
    const res: FluroResponse = await fluro.api.get("/content/plan", {
      cache: false,
    });
    return res.data as Plan[];
  } catch (err) {
    console.error("Error fetching plans", fluro.utils.errorMessage(err));
    Deno.exit(1);
  }
}

await login();

const plans = await getPlans();
const query = songName.toLowerCase();

for (const plan of plans) {
  for (const schedule of plan.schedules) {
    if (schedule.title.toLowerCase().includes(query)) {
      const notes = schedule.notes || {};
      console.log(
        schedule.title,
        schedule.key,
        removeHTML(notes["Person Responsible"]),
      );
    }
  }
}
