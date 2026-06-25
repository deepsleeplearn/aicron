/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  serverExternalPackages: ["cheerio", "rss-parser", "@mozilla/readability"]
};

export default nextConfig;
