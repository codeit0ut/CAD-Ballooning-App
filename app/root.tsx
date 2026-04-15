import type { LinksFunction } from "react-router";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration
} from "react-router";
import { Toaster } from "sonner";
import SonnerStyle from "sonner/dist/styles.css?url";
import Tailwind from "~/styles/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: Tailwind },
  { rel: "stylesheet", href: SonnerStyle }
];

export default function Root() {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full min-h-0">
        <Outlet />
        <Toaster richColors position="top-center" />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
