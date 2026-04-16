// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for deployment to GitHub Pages
  output: 'export',
  // Disable image optimization, as it's not compatible with static export
  images: {
    unoptimized: true,
  },
  turbopack: {},
}

// Configuration for the PWA plugin
const pwaConfig = {
  dest: 'public', // Destination directory for the service worker files
  register: true, // Automatically register the service worker
  skipWaiting: true, // Install new service worker as soon as it's available
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development
}

let withPWA = (config) => config

try {
  const { default: withPWAInit } = await import('@ducanh2912/next-pwa')
  withPWA = withPWAInit(pwaConfig)
} catch (error) {
  console.warn('next-pwa could not be loaded; continuing without PWA support.', error)
}

export default withPWA(nextConfig)
