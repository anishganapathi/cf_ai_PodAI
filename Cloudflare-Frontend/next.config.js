/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'export',
    distDir: 'out',
    images: {
        unoptimized: true,
    },
    // Remove assetPrefix or set to empty string
    assetPrefix: '',
    trailingSlash: true,
}

module.exports = nextConfig