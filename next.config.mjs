// next.config.mjs
import fs from 'node:fs'
import path from 'node:path'
import withPWA from 'next-pwa'

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const isUserOrOrgPagesSite = repositoryName === `${process.env.GITHUB_REPOSITORY_OWNER}.github.io`
const hasCustomDomain =
  fs.existsSync(path.join(process.cwd(), 'CNAME')) ||
  fs.existsSync(path.join(process.cwd(), 'public', 'CNAME'))
const projectBasePath =
  isGitHubActions && repositoryName && !isUserOrOrgPagesSite && !hasCustomDomain
    ? `/${repositoryName}`
    : ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for deployment to GitHub Pages
  output: 'export',
  trailingSlash: true,
  basePath: projectBasePath,
  assetPrefix: projectBasePath || undefined,
  // Disable image optimization, as it's not compatible with static export
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: projectBasePath,
  },
}

const pwaRuntimeCaching = [
  {
    urlPattern: ({ url }) => self.origin !== url.origin,
    handler: 'NetworkOnly',
    method: 'GET',
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-webfonts',
      expiration: {
        maxEntries: 4,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'google-fonts-stylesheets',
      expiration: {
        maxEntries: 4,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-font-assets',
      expiration: {
        maxEntries: 4,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-image-assets',
      expiration: {
        maxEntries: 64,
        maxAgeSeconds: 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /\.(?:js)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-js-assets',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /\.(?:css|less)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-style-assets',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'next-data',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60,
      },
    },
  },
  {
    urlPattern: ({ url }) => self.origin === url.origin,
    handler: 'NetworkFirst',
    method: 'GET',
    options: {
      cacheName: 'same-origin-pages',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60,
      },
      networkTimeoutSeconds: 3,
    },
  },
]

// Configuration for the PWA plugin
const pwaConfig = {
  dest: 'public', // Destination directory for the service worker files
  register: true, // Automatically register the service worker
  skipWaiting: true, // Install new service worker as soon as it's available
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development
  runtimeCaching: pwaRuntimeCaching,
}

export default withPWA(pwaConfig)(nextConfig)
