/** @type {import('next').NextConfig} */
const nextConfig = {
  // Konfiguriere CORS für n8n-Webhook-Anfragen
  async headers() {
    return [
      {
        // Matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  },
  // Deaktiviere ESLint für den Build-Prozess
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Deaktiviere TypeScript-Prüfungen während des Builds
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig; 