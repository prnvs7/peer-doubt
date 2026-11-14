/** @type {import('next').NextConfig} */
const nextConfig = {
    // Allow the dev server to be opened from this machine's LAN address.
    allowedDevOrigins: ['10.35.19.172', '10.36.73.76', '172.26.91.212', '10.36.77.183', 'localhost'],
    async headers() {
        return [{
            source: '/:path*',
            headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
            ],
        }];
    },
};

export default nextConfig;
