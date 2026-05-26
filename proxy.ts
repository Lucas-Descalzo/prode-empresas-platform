import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROOT_DOMAIN =
  process.env.APP_ROOT_DOMAIN?.toLowerCase() ??
  process.env.NEXT_PUBLIC_APP_ROOT_DOMAIN?.toLowerCase() ??
  "prode-empresas.com";

const RESERVED_SUBDOMAINS = new Set(["www", "admin", "api"]);
const LEGACY_PREFIXES = [
  "/mi-prediccion",
  "/fixture",
  "/ligas",
  "/grupos",
  "/tabla-general",
  "/faq",
  "/calendario",
  "/ayuda",
];

function getTenantSlug(hostHeader: string) {
  const host = hostHeader.toLowerCase().split(":")[0];

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.slice(0, -(`.${ROOT_DOMAIN}`.length));
    return slug && !RESERVED_SUBDOMAINS.has(slug) ? slug : null;
  }

  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length);
    return slug && !RESERVED_SUBDOMAINS.has(slug) ? slug : null;
  }

  return null;
}

function isStaticPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  if (LEGACY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/c/") || pathname === "/admin") {
    return NextResponse.next();
  }

  const slug = getTenantSlug(request.headers.get("host") ?? "");
  if (!slug) {
    return NextResponse.next();
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = pathname === "/" ? `/c/${slug}` : `/c/${slug}${pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: "/:path*",
};
