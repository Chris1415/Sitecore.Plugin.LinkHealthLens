import type { NextConfig } from "next"

// LNA: Chrome treats the Cloud Portal (public origin) framing localhost as
// public-to-private and blocks it unless this header is advertised. Never
// pair Allow-Origin: '*' with Allow-Credentials: 'true'.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Private-Network", value: "true" },
        ],
      },
    ]
  },
}

export default nextConfig
