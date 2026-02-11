require("dotenv").config();

/**
 * Resolve the Nylas GRANT ID for a given mailbox email address.
 * -------------------------------------------------------------
 * How it works:
 * 1. Reads NYLAS_MAILBOXES from environment variables.
 *    Example:
 *      NYLAS_MAILBOXES={"user1@gmail.com":"grant_123","user2@outlook.com":"grant_456"}
 *
 * 2. Parses NYLAS_MAILBOXES into a usable JS object.
 *
 * 3. Matches the provided email to its corresponding grant ID.
 *
 * Why this is separated:
 * - Keeps configuration out of the code.
 * - Allows multiple mailboxes for automation.
 * - Allows CI/CD to override mailbox → grant mappings easily.
 * - Enforces clean separation of concerns (Single Responsibility Principle).
 *
 * @param {string} email - The email address of the mailbox you want to access.
 * @returns {string} grantId - The corresponding Nylas Grant ID for that mailbox.
 * @throws {Error} if the env variable is missing, invalid JSON, or email has no grant entry.
 */

async function getGrantIdForEmail(email) {

  if (!process.env.NYLAS_MAILBOXES) {
    throw new Error(
      "Environment variable NYLAS_MAILBOXES is missing. Example: NYLAS_MAILBOXES={\"email\":\"grant\"}"
    );
  }

  let mailboxMap;

  try {
    mailboxMap = JSON.parse(process.env.NYLAS_MAILBOXES);
  } catch (err) {
    throw new Error(
      "NYLAS_MAILBOXES env variable is not valid JSON. Fix your .env file."
    );
  }

  const grantId = mailboxMap[email];

  if (!grantId) {
    throw new Error(`No grant id found for mailbox: ${email}`);
  }
  return grantId;
}

export { getGrantIdForEmail };


