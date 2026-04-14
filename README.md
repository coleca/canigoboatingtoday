# Boating Forecast PWA

A modern, production-ready Progressive Web App (PWA) that provides boaters with a comprehensive and easy-to-understand weather forecast, designed to be deployed on static site hosting platforms like GitHub Pages.

This project was built from the ground up based on a detailed technical design, following a rigorous test-driven development (TDD) methodology.

## Key Features

-   **Dynamic & Location-Aware:** Automatically fetches data from NWS and NOAA APIs based on the user's current GPS location.
-   **Comprehensive Forecasts:** Displays current weather conditions, a graphical tide chart, parsed wave height data, and a live weather radar map.
-   **Progressive Web App:** Fully installable on iOS and Android with offline support, thanks to a manifest and service worker configuration.
-   **Modern Stack:** Built with Next.js, React, and styled with Tailwind CSS.
-   **Fully Tested:** Includes a comprehensive three-tiered test suite (unit, integration, and E2E) with Jest, React Testing Library, and Playwright.
-   **Performance Optimized:** Uses client-side caching for the large NOAA tide station list to ensure a fast experience on repeat visits.

## Project Documentation

For a deeper understanding of the project's architecture and deployment, please refer to the following documents:

-   **[Technical Design Document](./TECHNICAL_DESIGN.md):** The blueprint for the application's architecture, component design, and data flow.
-   **[Deployment Guide](./DEPLOYMENT.md):** Step-by-step instructions for deploying the application to GitHub Pages.
-   **[Agent Guidelines](./AGENTS.md):** The development standards and testing procedures followed during the project's construction.
-   **[App Creation Prompt](./docs/PROMPT.md):** A comprehensive prompt to recreate this application from scratch using an AI coding assistant.

## Getting Started

### Prerequisites

-   Node.js (v20.x or later)
-   npm

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing

This project uses a three-tiered testing strategy.

### 1. Unit & Integration Tests

These tests use **Jest** and **React Testing Library**. They cover individual functions and component interactions.

To run these tests:

```bash
npm test
```

### 2. End-to-End (E2E) Tests

These tests use **Playwright** to simulate a full user journey in a real browser. They verify the application from end to end.

To run these tests:

```bash
npm run test:e2e
```

**Note:** The E2E tests will automatically build and start the application server.
