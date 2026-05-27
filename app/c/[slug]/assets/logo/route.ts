import { NextResponse } from "next/server";

import { getCorporateClient } from "@/lib/corporate/clients";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  return (
    parts[0] === 0 ||
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

function isAllowedExternalUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (url.protocol !== "https:") {
      return null;
    }

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname.endsWith(".local") ||
      isPrivateIpv4(hostname)
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const client = await getCorporateClient(slug);
  const logoUrl = client?.branding.logoUrl
    ? isAllowedExternalUrl(client.branding.logoUrl)
    : null;

  if (!logoUrl) {
    return new NextResponse(null, { status: 404 });
  }

  let response: Response;
  try {
    response = await fetch(logoUrl, {
      headers: { Accept: "image/*" },
      next: { revalidate: 3600 },
      redirect: "error",
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok || !contentType.startsWith("image/")) {
    return new NextResponse(null, { status: 502 });
  }

  const image = await response.arrayBuffer();
  if (image.byteLength > MAX_LOGO_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  return new NextResponse(image, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Type": contentType,
    },
  });
}
