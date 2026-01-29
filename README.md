# Playwright API Automation

A comprehensive API automation testing framework built with **Playwright** and **Node.js**.

## Overview

This project is designed for automated testing of APIs using the Playwright Test framework. It provides a structured approach to API testing with support for authentication, global setup, and helper utilities.

## Framework Details

### Test Framework: Playwright Test
- **Version**: @playwright/test v1.58.0
- **Language**: JavaScript (Node.js)
- **Type**: API Automation Testing

### Key Features

- **Parallel Test Execution**: Tests run in parallel for faster execution (`fullyParallel: true`)
- **Global Setup**: Centralized authentication and setup via `globalSetup.js`
- **Test Reports**: HTML reporting for detailed test results
- **Screenshots & Videos**: Automatic capture on test failures
- **Traces**: Detailed trace recording for debugging failed tests
- **Storage State**: Persistent authentication state management (`storageState/auth.json`)
- **CI/CD Integration**: Configured for continuous integration with retry logic
- **Test Timeout**: 30 minutes per test

## Project Structure

```
Playwright_API_Automation/
├── tests/                          # Test files
│   └── invoiceCreation.spec.js    # Invoice creation tests
├── Util/                          # Utility files
│   ├── globalSetup.js             # Global setup and authentication
│   └── helper.js                  # Helper functions and utilities
├── storageState/                  # Authentication storage
│   └── auth.json                  # Stored auth credentials
├── playwright-report/             # Test reports (generated)
├── test-results/                  # Test results (generated)
├── playwright.config.js           # Playwright configuration
└── package.json                   # Project dependencies
```

## Dependencies

```json
{
  "dependencies": {
    "playwright": "^1.58.0",
    "dayjs": "^1.11.19"
  },
  "devDependencies": {
    "@playwright/test": "^1.58.0",
    "@types/node": "^25.1.0"
  }
}
```

## Installation

```bash
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in headed mode
npx playwright test --headed

# Run specific test file
npx playwright test tests/example.spec.js

# Run tests with UI mode
npx playwright test --ui

# Run tests on specific browser
npx playwright test --project=chromium
```

## Configuration

All test configurations are defined in `playwright.config.js`:
- **Test Directory**: `./tests`
- **Global Setup**: `./Util/globalSetup.js`
- **Reporter**: HTML report
- **Test Timeout**: 30 minutes
- **Screenshots**: Captured on failure only
- **Videos**: Retained on failure
- **Traces**: Retained on failure for debugging

## Authentication

Authentication is handled globally via:
- `Util/globalSetup.js`: Sets up authentication for all tests
- `storageState/auth.json`: Stores authentication state between test runs

## Utilities

Helper functions are available in `Util/helper.js` for common testing operations and API interactions.

## Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

## CI/CD Pipeline

The project is configured for CI/CD environments with:
- Automatic retries (2 retries on CI)
- Sequential test execution on CI (workers: 1)
- Forbid test.only on CI
- HTML reporting for all runs
