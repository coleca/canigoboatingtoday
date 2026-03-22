# Deployment Guide

## GitHub Pages

This repo is configured to deploy as a static Next.js export to GitHub Pages.

### What Is Already Configured

- [`next.config.mjs`](./next.config.mjs) uses `output: 'export'`
- the GitHub Actions workflow at [`.github/workflows/nextjs.yml`](./.github/workflows/nextjs.yml) builds and uploads `./out`
- `basePath` and `assetPrefix` are computed automatically during GitHub Actions builds from `GITHUB_REPOSITORY`
- the manifest uses relative URLs so it works under a project-site path like `/canigoboatingtoday`

### How the Base Path Works

On GitHub Actions:

- if the repo is a project site such as `username/canigoboatingtoday`, the app builds with `basePath=/canigoboatingtoday`
- if the repo is a user/org site such as `username/username.github.io`, no base path is added

Locally, no base path is used, so development remains at `http://localhost:3000/`.

### Required GitHub Setting

In your GitHub repository:

1. Open `Settings`
2. Open `Pages`
3. Under `Build and deployment`, set `Source` to `GitHub Actions`

### Deployment Trigger

The Pages workflow runs on:

- pushes to `main`
- manual dispatch from the Actions tab

### Local Verification

Build the static export locally:

```bash
npm run build
```

The exported site will be written to `out/`.

### Notes

- The workflow intentionally does not use `actions/configure-pages` because this repo already manages Next.js static export behavior directly.
- The Playwright config serves `out/` with a static server for E2E tests because `next start` does not work with `output: 'export'`.
