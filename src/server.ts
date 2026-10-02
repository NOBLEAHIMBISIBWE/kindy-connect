import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function isApiOrServerFn(request?: Request): boolean {
  if (!request) return false;
  const url = request.url || "";
  const accept = request.headers?.get("accept") || "";
  const contentType = request.headers?.get("content-type") || "";

  let hasServerFnHeader = false;
  if (request.headers) {
    try {
      hasServerFnHeader = Array.from(request.headers.keys()).some(
        (k) => k.toLowerCase().includes("server-fn") || k.toLowerCase().includes("tanstack"),
      );
    } catch {}
  }

  return (
    hasServerFnHeader ||
    request.headers?.has("x-server-fn") ||
    request.headers?.has("x-tanstack-start-server-fn") ||
    request.headers?.has("x-server-fn-id") ||
    request.headers?.has("x-tanstack-start-server-fn-id") ||
    request.headers?.has("x-tanstack-server-fn") ||
    request.headers?.has("x-tanstack-server-fn-id") ||
    url.includes("/_server") ||
    url.includes("_serverFn") ||
    url.includes("serverFn") ||
    url.includes("intent=serverFn") ||
    accept.includes("application/json") ||
    contentType.includes("application/json") ||
    contentType.includes("text/plain")
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
  request: Request,
): Promise<Response> {
  if (response.status < 500) return response;

  if (isApiOrServerFn(request)) {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const body = await response
        .clone()
        .text()
        .catch(() => "");
      return new Response(
        JSON.stringify({
          error: "Server function error (500 Internal Server Error)",
          message: body || "Internal Server Error",
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }
    return response;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/favicon.ico" || url.pathname === "/favicon.png") {
        return new Response(null, { status: 404 });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response, request);
    } catch (error) {
      console.error("Catastrophic server fetch error:", error);
      if (isApiOrServerFn(request)) {
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : "Internal Server Error",
          }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
