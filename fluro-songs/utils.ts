import type { Plan, Schedule } from "./types.ts";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

export const removeHTML = (html: string): string => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>?/gm, "")
    .replace(/&(amp|nbsp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity]);
};

export const findSongs = (plans: Plan[], songName: string): Schedule[] => {
  const query = songName.toLowerCase();
  return plans.flatMap((plan) =>
    (plan.schedules ?? []).filter((schedule) =>
      schedule.title?.toLowerCase().includes(query)
    )
  );
};
