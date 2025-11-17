# Deployment Guide: GitHub Pages

This guide provides step-by-step instructions for deploying this Next.js application to GitHub Pages.

## 1. Overview

Deploying a Next.js application to GitHub Pages requires a **static export**. This means our application is pre-built into a collection of static HTML, CSS, and JavaScript files that can be served directly by a simple web server like the one provided by GitHub Pages.

This project has been configured to support this deployment method. The deployment process is automated using **GitHub Actions**.

## 2. Required Configuration

To enable static export, the `next.config.mjs` file must be configured with `output: 'export'`. This changes the `npm run build` command to generate a static site in the `/out` directory instead of a standalone server.

**Note:** This change has already been made in this project.

## 3. Automated Deployment with GitHub Actions

The recommended way to deploy is by using the provided GitHub Actions workflow. This workflow will automatically build, export, and deploy your application whenever you push to the `main` branch.

### Setting up the Workflow

1.  **Create the Workflow File:** Create a file at the following path in your repository: `.github/workflows/deploy.yml`.

2.  **Add the Workflow Content:** Copy and paste the following content into the `deploy.yml` file:

    ```yaml
    name: Deploy to GitHub Pages

    on:
      push:
        branches:
          - main # Trigger the workflow on pushes to the main branch
      workflow_dispatch: # Allow manual triggering of the workflow

    jobs:
      build-and-deploy:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout 🛎️
            uses: actions/checkout@v3

          - name: Setup Node.js
            uses: actions/setup-node@v3
            with:
              node-version: '20' # Use a Node.js version compatible with the project
              cache: 'npm'

          - name: Install Dependencies 📦
            run: npm install

          - name: Build Application 🏗️
            run: npm run build

          - name: Setup Pages
            uses: actions/configure-pages@v3

          - name: Upload Artifact ⬆️
            uses: actions/upload-pages-artifact@v2
            with:
              path: './out' # The directory of the static export

          - name: Deploy to GitHub Pages 🚀
            id: deployment
            uses: actions/deploy-pages@v2
    ```

3.  **Enable GitHub Pages:**
    *   Go to your repository's **Settings** tab.
    *   Navigate to the **Pages** section in the left sidebar.
    *   Under "Build and deployment", change the **Source** from "Deploy from a branch" to **GitHub Actions**.

### How It Works

-   **Trigger:** The workflow runs automatically on every push to the `main` branch.
-   **Build:** It checks out your code, installs the dependencies, and runs the `npm run build` command, which generates the static site in the `/out` directory.
-   **Deploy:** It takes the contents of the `/out` directory and deploys them to your GitHub Pages site.

Once the workflow completes successfully, your application will be live at `https://<your-username>.github.io/<your-repository-name>/`.
