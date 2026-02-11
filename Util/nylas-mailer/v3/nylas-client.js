require("dotenv").config();
import Nylas from "nylas";

/**
 * Core Configuration
 * ------------------
 * Nylas requires:
 *  - API Key (identifies and authenticates your Nylas application)
 *  - API URI (defaults to US region unless overridden)
 *
 * These values must be loaded BEFORE constructing the SDK client.
 */

//@ts-ignore
const apiKey = process.env.NYLAS_API_KEY;
const apiUri = process.env.NYLAS_API_URI || "https://api.us.nylas.com";

//@ts-nocheck
if (!apiKey) {
  throw new Error("NYLAS_API_KEY is required in environment variables.");
}

/**
 * Shared Nylas Instance - Singleton Pattern
 * ---------------------
 * Nylas recommends reusing the SDK client instead of re-creating it for every call.
 *
 * Advantages:
 *  - Better performance
 *  - Lower memory usage
 *  - Cleaner architecture
 *
 * This client will be used throughout the mailer system for all mailbox operations.
 */

const nylas = new Nylas({
  apiKey,
  apiUri
});

export default { nylas };


