const https = require("node:https");
const fs = require("node:fs");

const env = fs.readFileSync(".env.local", "utf8");
const key = env.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim().replaceAll('"', "");

if (!key) {
  console.error("No OPENROUTER_API_KEY");
  process.exit(1);
}

const body = JSON.stringify({
  model: "openrouter/free",
  messages: [{ role: "user", content: "Say hi in one word." }],
});

const req = https.request(
  {
    hostname: "openrouter.ai",
    port: 443,
    path: "/api/v1/chat/completions",
    method: "POST",
    family: 4,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
    timeout: 60_000,
  },
  (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      console.log("status", res.statusCode);
      console.log(text.slice(0, 400));
    });
  },
);

req.on("timeout", () => {
  req.destroy(new Error("CONNECT_TIMEOUT"));
});
req.on("error", (error) => {
  console.error("error", error.message);
  process.exit(1);
});
req.write(body);
req.end();
