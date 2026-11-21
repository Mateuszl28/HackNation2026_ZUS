import type { NextConfig } from "next";
import path from "path";

const isProd = process.env.NODE_ENV === "production";

// Nagłówki bezpieczeństwa (CSP tylko w produkcji – tryb deweloperski Next.js wymaga eval/HMR).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isProd
    ? [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
          ].join("; "),
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  transpilePackages: ["@zus/engine"],
  // obraz Docker: samodzielny serwer z wyłącznie potrzebnymi zależnościami (monorepo → śledzenie od katalogu głównego)
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  poweredByHeader: false,
  // OCR: natywny canvas i Tesseract poza bundlerem; model językowy dołączony do obrazu standalone
  serverExternalPackages: ["tesseract.js", "@napi-rs/canvas", "@tesseract.js-data/pol"],
  outputFileTracingIncludes: { "/api/**": ["../../node_modules/@tesseract.js-data/pol/4.0.0/**", "../../node_modules/tesseract.js-core/**"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
