import https from "node:https";

export type HttpsResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

function httpsRequest(
  method: "GET" | "POST",
  url: string,
  headers: Record<string, string>,
  body: string | Buffer | null,
  timeoutMs: number,
): Promise<HttpsResponse> {
  const parsed = new URL(url);
  const payload = body === null ? null : typeof body === "string" ? Buffer.from(body) : body;

  return new Promise((resolve, reject) => {
    const requestHeaders: Record<string, string | number> = { ...headers };
    if (payload) {
      requestHeaders["Content-Length"] = payload.length;
    }

    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        family: 4,
        headers: requestHeaders,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 500,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("CONNECT_TIMEOUT"));
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

export function httpsGet(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 30_000,
): Promise<HttpsResponse> {
  return httpsRequest("GET", url, headers, null, timeoutMs);
}

export function httpsPost(
  url: string,
  headers: Record<string, string>,
  body: string | Buffer,
  timeoutMs = 120_000,
): Promise<HttpsResponse> {
  return httpsRequest("POST", url, headers, body, timeoutMs);
}
