/// <reference types="vite/client" />

declare module "react-dom/server.browser" {
  import type { ReactNode } from "react";

  export function renderToReadableStream(
    children: ReactNode,
    options?: import("react-dom/server").RenderToReadableStreamOptions
  ): Promise<import("react-dom/server").ReactDOMServerReadableStream>;
}
