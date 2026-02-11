const { getGrantIdForEmail } = require("./nylas-grantmanager.js");
const { getMailBox } = require("./nylas-mailer.js");

/**
 * High-level entry used by tests.
 * You pass an email; internally we resolve grantId & return mailbox helpers.
 *
 * @param {string} emailAddress
 */
async function getMailboxFor(emailAddress) {

  //get the grant id for the email address -- Hard Coding it for now -- Will remove it for later
  
  let grantId;
  try {
    grantId = await getGrantIdForEmail(emailAddress);
  } catch (error) {
    console.error("Error fetching grant ID:", error);
  }

  console.log("DEBUG grantId inside mailer-service:", grantId);

  // 2. Build mailbox helpers for this grant
  const mailbox = await getMailBox({
    grantId,
    // you can override these if needed:
    pollInterval: 20000,
    timeout: 300000,// 5 minutes
    debug: false
  });

  return mailbox;
}

module.exports = { getMailboxFor };

/**
 * Mailbox Loader for Nylas V3 Mailer Service
 * ------------------------------------------
 * This module acts as the SINGLE ENTRY POINT for your automated tests
 * to access mailbox utilities such as:
 *    - waitForEmail()
 *    - searchBySubject()
 *    - getLatestEmail()
 *
 * Responsibilities:
 * 1. Accept test email address
 * 2. Resolve the mailbox's GRANT ID (from env → NYLAS_MAILBOXES)
 * 3. Construct a mailbox instance with the Nylas V3 service
 * 4. Return a mailbox object containing mailbox actions
 *
 * This keeps tests clean, readable, and independent of Nylas details
 * 
 */