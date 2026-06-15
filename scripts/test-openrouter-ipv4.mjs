import fs from "node:fs";
import { httpsPost } from "../lib/http-ipv4.ts";

const env = fs.readFileSync(".env.local", "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim().replaceAll('"', "");

if (!key) {
  console.error("No OPENROUTER_API_KEY");
  process.exit(1);
}

const response = await httpsPost(
  "https://openrouter.ai/api/v1/chat/completions",
  {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  JSON.stringify({
    model: "openrouter/free",
    messages: [{ role: "user", content: "hi" }],
  }),
);

console.log("status", response.status);
console.log(response.body.toString("utf8").slice(0, 300));
