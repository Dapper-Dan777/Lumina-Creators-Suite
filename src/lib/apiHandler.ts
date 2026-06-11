import { toFetchHandler } from "srvx/node";

type FetchHandler = (request: Request) => Response | Promise<Response>;

let apiHandlerPromise: Promise<FetchHandler> | undefined;

export async function handleApiRequest(request: Request): Promise<Response> {
  if (!apiHandlerPromise) {
    apiHandlerPromise = import("../../server/app.js").then((mod) =>
      toFetchHandler(mod.default),
    );
  }
  const handler = await apiHandlerPromise;
  return handler(request);
}