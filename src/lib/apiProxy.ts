function isLocalTarget(target: string) {
  try {
    const host = new URL(target).hostname;
    return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(host);
  } catch {
    return true;
  }
}

export function getApiProxyTarget() {
  const target = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
  if (!target || isLocalTarget(target)) return null;
  return target;
}

export async function proxyApiRequest(request: Request): Promise<Response> {
  const target = getApiProxyTarget();
  if (!target) {
    return new Response(
      JSON.stringify({
        error: "API nicht erreichbar",
        message:
          "API_PROXY_TARGET fehlt oder zeigt auf localhost. Backend deployen (z.B. Render) und die URL in Vercel als Environment Variable setzen.",
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  const url = new URL(request.url);
  const upstream = `${target}${url.pathname}${url.search}`;
  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  try {
    const res = await fetch(upstream, init);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "API proxy failed",
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}