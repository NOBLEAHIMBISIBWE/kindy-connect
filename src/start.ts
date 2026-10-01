import { createStart, createMiddleware } from "@tanstack/react-start";
import { isRedirect, isNotFound } from "@tanstack/react-router";
import { renderErrorPage } from "./lib/error-page";

function isApiOrServerFn(request?: Request): boolean {
  if (!request) return false;
  const url = request.url || "";
  const accept = request.headers?.get("accept") || "";
  const contentType = request.headers?.get("content-type") || "";
  return (
    request.headers?.has("x-server-fn") ||
    request.headers?.has("x-tanstack-start-server-fn") ||
    url.includes("/_server") ||
    url.includes("intent=serverFn") ||
    accept.includes("application/json") ||
    contentType.includes("application/json")
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
      throw error;
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
