import Fluro from "npm:fluro";
import { removeHTML } from "./utils.ts";
import type { FluroResponse, Plan } from "./types.ts";

const fluro = new Fluro({
  apiURL: "https://api.fluro.io",
});

const songName = Deno.args[0];

const accountID = Deno.env.get("FLURO_ACCOUNT");
const username = Deno.env.get("FLURO_USERNAME");
const password = Deno.env.get("FLURO_PASSWORD");

if (!username || !password) {
  console.log(
    "Please provide FLURO_USERNAME and FLURO_PASSWORD in the environment",
  );
  Deno.exit(1);
}

async function login() {
  await fluro.auth.login({
    username,
    password,
  })
    .then(async function () {
      await fluro.auth.changeAccount(accountID);
    })
    .catch(function (err: Error) {
      console.log("Authentication Failed", fluro.utils.errorMessage(err));
    });
}

async function getPlans() {
  const plans = await fluro.api.get("/content/plan", {
    cache: false,
  }).then(function (res: FluroResponse) {
    return res.data;
  }).catch((err: Error) => {
    console.log("Error fetching plans", fluro.utils.errorMessage(err));
  });
  return plans;
}

await login();

const plans = await getPlans();

plans.forEach((plan: Plan) => {
  plan.schedules.forEach((schedule) => {
    const regex = new RegExp(songName, "i");
    if (schedule.title.match(regex)) {
      const notes = schedule.notes || {};
      console.log(
        schedule.title,
        schedule.key,
        removeHTML(notes["Person Responsible"]),
      );
    }
  });
});
