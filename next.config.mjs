// next.config.mjs
import withPWA from 'next-pwa'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Any standard Next.js config options can go here
}

// Configuration for the PWA plugin
const pwaConfig = {
  dest: 'public', // Destination directory for the service worker files
  register: true, // Automatically register the service worker
  skipWaiting: true, // Install new service worker as soon as it's available
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development
}

export default withPWA(pwaConfig)(nextConfig)
