import type { Plan } from "./types.ts";

const API_URL = "https://api.fluro.io";

export const errorMessage = (status: number, body: string): string => {
  try {
    const data = JSON.parse(body);
    if (typeof data?.message === "string" && data.message) return data.message;
    if (typeof data === "string" && data) return data;
  } catch {
    if (body) return body;
  }
  return `HTTP ${status}`;
};

export async function getPlans(token: string): Promise<Plan[]> {
  const res = await fetch(`${API_URL}/content/plan`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(errorMessage(res.status, body));
  return JSON.parse(body);
}
