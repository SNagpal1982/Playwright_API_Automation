# Nylas V3 Mailer Service
### Automated Email Retrieval and Verification for Playwright Test Suites

## Overview

The Nylas Mailer Service provides a unified interface to access and validate emails sent during automated end-to-end tests.  
It abstracts the complexities of the Nylas V3 API and enables test engineers to perform mailbox operations using simple function calls without handling authentication, grant management, or HTTP requests.

This service supports multiple mailboxes, each mapped to its corresponding Nylas Grant ID, and is fully compatible with Gmail and Outlook (subject to Azure AD approval in enterprise environments).

## Key Features

- Unified mailbox helper for Gmail and Outlook accounts
- Grant ID management through environment configuration
- Native subject search using Nylas provider-level search
- Polling-based wait utilities for email arrival
- Fetching latest messages, searching messages, and downloading attachments
- Architecture designed for extensibility and test automation reliability
- Clean separation of responsibilities and reusable service layer

## Architecture

The mailer service follows a layered, modular architecture:

### 1. Presentation Layer (Test Layer)
Interfaces consumed directly by Playwright tests.  
Tests never interact with Nylas or OAuth details.  
Example usage:

```js
const mailbox = await getMailboxFor("user@example.com");
const email = await mailbox.waitForEmail("Subject Text");
```

### 2. Domain Layer (Core Service Logic)
Contains:
- `getMailboxFor()` – resolves mailbox identity and returns a mailbox client
- `nylas-mailer.js` – mailbox behaviors such as search, wait, download

### 3. Infrastructure Layer (Technical Integration)
Handles:
- Nylas client initialization
- Environment variable loading
- Parsing mailbox-to-grant mappings
- Low-level HTTP requests (through Nylas SDK)

### Patterns Used
- Factory Pattern for mailbox instance creation  
- Adapter Pattern over Nylas API  
- Dependency Injection for config isolation  
- Single Responsibility Principle across modules  
- 12-Factor-app compliant environment configuration  

## Folder Structure

```
services/
  nylas-mailer/
    v3/
      nylasClient.js
      nylas-mailer.js
    utils/
      nylas-grantmanager.js
    getMailboxFor.js
```

## Environment Configuration

Add the following variables to your `.env` file:

```
NYLAS_API_KEY=your-nylas-api-key
NYLAS_API_URI=https://api.us.nylas.com

NYLAS_MAILBOXES={"user1@example.com":"grant-id-1","user2@example.com":"grant-id-2"}
```

## Grant ID Management

Nylas V3 creates exactly one grant per email address.  
Once generated via Hosted OAuth, the Grant ID remains stable unless revoked by the provider.

## Usage in Playwright Tests

```js
import { getMailboxFor } from "../../../services/nylas-mailer/getMailboxFor";

test("validate retainer request email", async () => {
    const mailbox = await getMailboxFor("user@example.com");

    const received = await mailbox.waitForEmail("Retainer Request");
    expect(received.subject).toBe("Retainer Request");
});
```

### Searching Messages by Subject

```js
const result = await mailbox.searchBySubject("Payment Request", 1);
```

### Waiting for Email to Arrive

```js
const msg = await mailbox.waitForEmail("Invoice");
```

### Getting the Latest Email

```js
const latest = await mailbox.getLatestEmail();
```

### Downloading Attachments

```js
const fileBuffer = await mailbox.downloadAttachment(msg.id);
```

## Nylas Hosted OAuth Requirements

To generate Grant IDs:

1. Redirect the user to `/v3/connect/auth`
2. User authenticates via Google or Microsoft
3. Nylas forwards the authorization code to your callback
4. Exchange code for grant using `/v3/connect/token`
5. Nylas responds with: grant_id, email, metadata

Store the `grant_id` in `NYLAS_MAILBOXES`.

## Error Handling and Logging

- Detailed runtime validation  
- Automatic checks for missing environment variables  
- Structured logging available via `NYLAS_DEBUG=true`  
- Clear remediation guidance for configuration errors  

## Extensibility

This module can be extended to support:

- Additional providers  
- Webhook-based email monitoring  
- Test fixtures for mailbox setup and teardown  
- Advanced filters and search operations  
- Mailbox health diagnostics  

## Limitations

- Outlook enterprise accounts require Azure AD administrator approval  
- Gmail folder filtering requires folder IDs  
- Polling depends on the configured interval  

## Conclusion

The Nylas Mailer Service provides a robust email automation layer for Playwright-based testing frameworks.  
It abstracts OAuth, Nylas V3 APIs, and mailbox differences into a unified interface that is simple to use and maintain.
