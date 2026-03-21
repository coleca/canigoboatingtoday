# Agent Development Guidelines

This document outlines the standards, conventions, and testing procedures to be followed by any agent working on this project. The goal is to ensure the development of a robust, maintainable, and high-quality application.

## 1. Technology Stack

- **Framework:** Next.js with React
- **Styling:** Tailwind CSS
- **Unit & Integration Testing:** Jest with React Testing Library
- **End-to-End (E2E) Testing:** Playwright
- **Package Manager:** `npm`

## 2. Development Workflow

1.  **Understand the Goal:** Before writing any code, ensure you have a clear understanding of the feature or task. Refer to the `TECHNICAL_DESIGN.md` for architectural and design details.
2.  **Follow a Test-Driven Approach:** For any new logic or component, a corresponding test must be written.
3.  **Code:** Implement the feature, adhering to the coding standards below.
4.  **Test:** Run all relevant tests (unit, integration, and E2E) to ensure your changes are correct and have not introduced any regressions.
5.  **Verify:** After making changes, confirm they work as expected by running the application or tests.

## 3. Coding Standards

- **Code Style:** Follow the standard Next.js and ESLint configurations provided during project setup. All code should be formatted automatically using the integrated Prettier setup.
- **Component Structure:** Components should be small and focused on a single responsibility. Create components in the `/components` directory. Page components will reside in the `/app` directory.
- **API Interactions:** All external API calls must be centralized in a dedicated service module (e.g., `/lib/weatherService.js`). Do not make direct `fetch` calls from within components. This makes the code easier to test and maintain.
- **Error Handling:** All asynchronous operations and API calls must include robust error handling (`try...catch` blocks or equivalent). Never let an error fail silently.
- **Environment Variables:** All API keys or other secrets must be managed through environment variables (`.env.local`) and accessed via `process.env`. Do not hardcode secrets in the source code.

## 4. Testing Requirements

A comprehensive, three-tiered testing strategy is required for all code changes. The goal is to achieve high confidence in the application's stability and correctness.

### Unit Tests
- **Tool:** Jest
- **Location:** `__tests__` directory or `*.test.js` files alongside the source files.
- **Requirement:** All utility functions, data transformation logic, and complex calculations must have unit tests covering both successful and edge-case scenarios.

### Integration Tests
- **Tool:** React Testing Library with Jest
- **Location:** `__tests__` directory, typically for components.
- **Requirement:** Every React component must have integration tests that verify it renders correctly and that user interactions produce the expected outcome. Components should be tested in isolation, with API calls mocked.

### End-to-End (E2E) Tests
- **Tool:** Playwright
- **Location:** `/tests` directory (or `/e2e`).
- **Requirement:** Critical user journeys must be covered by E2E tests. This includes:
    1.  Loading the application and allowing geolocation.
    2.  Fetching and displaying weather data for the user's location.
    3.  Verifying that all key UI elements (tide chart, radar map, etc.) are present and contain data.
- **Command to run:** `npx playwright test`

**All tests must pass before any change is considered complete.**
