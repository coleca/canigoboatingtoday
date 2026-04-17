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
  const {
    default: withPWAInit,
    runtimeCaching: defaultRuntimeCaching,
  } = await import('@ducanh2912/next-pwa')

  const runtimeCaching = defaultRuntimeCaching.map((entry) => {
    const cacheName = entry.options?.cacheName

    if (cacheName === 'next-static-js-assets' || cacheName === 'static-js-assets') {
      return {
        ...entry,
        handler: 'NetworkFirst',
        options: {
          ...entry.options,
          networkTimeoutSeconds: 3,
        },
      }
    }

    return entry
  })

  withPWA = withPWAInit({
    ...pwaConfig,
    workboxOptions: {
      runtimeCaching,
    },
  })
} catch (error) {
  console.warn('next-pwa could not be loaded; continuing without PWA support.', error)
}

export default withPWA(nextConfig)
