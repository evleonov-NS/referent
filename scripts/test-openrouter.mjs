import dns from "node:dns";
import fs from "node:fs";

dns.setDefaultResultOrder("ipv4first");

const env = fs.readFileSync(".env.local", "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim().replaceAll('"', "");

if (!key) {
  console.error("No OPENROUTER_API_KEY");
  process.exit(1);
}

try {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [{ role: "user", content: "hi" }],
    }),
  });

  console.log("status", response.status);
  console.log((await response.text()).slice(0, 300));
} catch (error) {
  console.error("ERR", error?.name, error?.message);
  if (error?.cause) console.error("cause", error.cause);
}
