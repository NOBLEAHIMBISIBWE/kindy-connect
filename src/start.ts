import { createStart, createMiddleware } from "@tanstack/react-start";
import { isRedirect, isNotFound } from "@tanstack/react-router";
import { renderErrorPage } from "./lib/error-page";

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

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    return await next();
  } catch (error: any) {
    // If it's a redirect or explicit Response object, rethrow so TanStack Start processes the redirect/response
    if (
      isRedirect(error) ||
      error instanceof Response ||
      (error != null &&
        typeof error === "object" &&
        "statusCode" in error &&
        error.statusCode >= 300 &&
        error.statusCode < 400)
    ) {
      throw error;
    }

    // Handle 404 Not Found cleanly
    if (
      isNotFound(error) ||
      (error != null &&
        typeof error === "object" &&
        "statusCode" in error &&
        error.statusCode === 404)
    ) {
      return new Response("404 Not Found", {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (isApiOrServerFn(request)) {
      console.error("Server function error caught in middleware:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error) || "Internal Server Error",
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }

    // Log the actual underlying SSR error to server stdout/stderr
    console.error("SSR Middleware caught unhandled error:", error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
