import { writeFile, mkdir } from "fs/promises";

export async function saveLeads(leads: unknown[]) {
  await mkdir("data", { recursive: true });
  await writeFile("data/leads.json", JSON.stringify(leads, null, 2));
}
