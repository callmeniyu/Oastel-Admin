import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    /* config options here */
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
                pathname: "/**",
            },
            {
                protocol: "http",
                hostname: "192.168.33.50",
                port: "3001",
                pathname: "/images/**",
            },
            {
                protocol: "http",
                hostname: "192.168.33.50",
                port: "3002",
                pathname: "/images/**",
            },
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
                pathname: "/**",
            },
        ],
        // Allow blob URLs for image previews and unsafe content
        dangerouslyAllowSVG: true,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
}

export default nextConfig
