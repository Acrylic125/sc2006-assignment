import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

// const withBundleAnalyzer = require("@next/bundle-analyzer")({
//   enabled: true,
// });

// module.exports = withBundleAnalyzer(nextConfig);
export default nextConfig;
