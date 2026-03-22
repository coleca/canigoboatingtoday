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

// Configuration for the PWA plugin
const pwaConfig = {
  dest: 'public', // Destination directory for the service worker files
  register: true, // Automatically register the service worker
  skipWaiting: true, // Install new service worker as soon as it's available
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development
}

export default withPWA(pwaConfig)(nextConfig)
