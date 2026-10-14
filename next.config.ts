import type { NextConfig } from "next";

// CAP_BUILD=1 makes a static export for the Android app (see README).
const forApp = process.env.CAP_BUILD === "1";

const nextConfig: NextConfig = {
  ...(forApp ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    if (forApp) return [];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "nfc=(self), camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "connect-src 'self'",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
