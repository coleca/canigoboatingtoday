# Deployment Guide

## Vercel

This repo is now intended to deploy on Vercel, not GitHub Pages.

### Why

The app uses Next.js route handlers for:

- `app/api/forecast/route.js`
- `app/api/location/route.js`
- `app/api/tides/route.js`

Those server routes proxy NOAA/NWS/Census requests so the browser does not have to call those upstream APIs directly.

### Required Runtime

- Node.js `24.x`

The repo is pinned to that version in:

- [.nvmrc](./.nvmrc)
- [package.json](./package.json)

### Vercel Settings

Vercel should auto-detect this as a Next.js app. The defaults are correct:

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Install Command: `npm install`

You should not configure this project as a static export.

### Custom Domain

After the first successful deploy:

1. Open the project in Vercel
2. Go to `Settings`
3. Go to `Domains`
4. Add `canigoboatingtoday.com`
5. Update your DNS records to the values Vercel gives you

### Local Verification

Use Node `24` locally if possible:

```bash
nvm install
nvm use
npm install
npm test -- --runInBand
npm run build
```

If you want to run the production server locally:

```bash
npm run start
```

### Notes

- The old GitHub Pages workflow is no longer part of the deployment path.
- If a stale service worker exists in your browser from older deploys, unregister it after switching hosts.
