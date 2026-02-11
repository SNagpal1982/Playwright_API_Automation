require("dotenv").config();
const { nylas } = require("./nylas-client.js").default;
const { convert } = require("html-to-text");


/**
 * Build a mailbox helper for a specific grant.
 *
 * @param {Object} options
 * @param {string} options.grantId - Nylas grant ID for this mailbox.
 * @param {number} [options.pollInterval] - ms between polls when waiting.
 * @param {number} [options.timeout] - max wait time in ms.
 * @param {boolean} [options.debug] - enable logging.
 */

async function getMailBox(options = {}) {

    const config = {
        grantId: options.grantId,
        pollInterval: options.pollInterval || 2000,
        timeout: options.timeout || 30000,
        debug: options.debug || false
    };

    if (!config.grantId) {
        throw new Error("grantId is required to build mailbox.");
    }

    const debug = (...msg) => config.debug && console.log("[NYLAS MAILBOX]", ...msg);

    /**
     * List messages with raw queryParams (advanced usage).
     * @param {Object} queryParams
     */
    async function listMessages(queryParams = {}) {
        const res = await nylas.messages.list({
            identifier: config.grantId,
            queryParams
        });
        return res;
    }

    /**
     * Search messages by subject using provider-native search.
     * @param {string} subject
     * @param {number} [limit]
     */
    async function searchBySubject(subject, limit) {

        const res = await nylas.messages.list({
            identifier: config.grantId,
            queryParams: {
                search_query_native: `subject:${subject}`,
                limit
            }
        });

        const messages = res.data;

        if (!messages || messages.length === 0) {
            throw new Error(`No messages found for subject: ${subject}`);
        }
        return messages[0];
    }

    /**
     * Get the latest message that matches a subject.
     * @param {string} subject
     */
    async function getLatestEmail(subject) {
        const messages = await searchBySubject(subject, 1);

        if (!messages || messages.length === 0) {
            throw new Error(`No messages found for subject "${subject}"`);
        }

        return messages[0];
    }

    /**
     * Wait until a message matching subject arrives (polling).
     * @param {string} subject
     */
    async function waitForEmail(subject) {
        const start = Date.now();
       
        while (Date.now() - start < config.timeout) {
            
            try{
                const messages = await searchBySubject(subject, 1);
                if (messages) {
                    console.log("Email arrived:");
                    const end = Date.now();
                    console.log(`Email wait time: ${end - start} ms`);
                    return messages;
                }
            } catch (error) {
                debug("Email not found yet, retrying...");
            }

            await new Promise((r) => setTimeout(r, config.pollInterval));
        }
        const end = Date.now();
        console.log(`Email wait time: ${end - start} ms`);
        throw new Error(
            `Email with subject "${subject}" not found within ${config.timeout} ms`
        );
    }

    //function for getting attachment metadata based on message id
    async function getAttachmentMetadata(messageId) {
        if (!messageId) {
            throw new Error("messageId is required.");
        }

        try {
            console.log(`[Nylas] Fetching attachment metadata for messageId=${messageId}`);

            const response = await nylas.messages.find({
                identifier: config.grantId,
                messageId
            });

            // Attachments are inside response.data
            const attachments = response?.data?.attachments || [];

            if (attachments.length === 0) {
                console.warn(`[Nylas] No attachments found for messageId=${messageId}`);
                return [];
            }

            console.log(`[Nylas] Retrieved ${attachments.length} attachment(s) for messageId=${messageId}`);
            return attachments;

        } catch (error) {
            console.error(`[Nylas] Error fetching attachments for messageId=${messageId}: ${error.message}`);
            throw error;
        }
    }

    //function for getting message body content
    async function getBodyContent(subject) {

        console.log("starting to get body for the email with the subject:" + subject);

        //verify if the subject is passed
        if (!subject || subject.trim().length === 0) {
            console.error('subject not found, please pass the subject or check the subject value');
            return null;
        }

        try {
            // get the message id based on subject
            const messageid = await getMessageid(subject);
            const message = await nylas.messages.find({
                identifier: config.grantId,
                messageId: messageid
            });

            if (!message || !message.data) {
                throw new Error("Message not found or malformed");
            }
            const body = message.data.body || message.data.snippet;
            const textBody = convert(body, { wordwrap: false });

            console.log("The body content for the email is :" + textBody);

            if (!textBody) {
                console.error("No body content found for subject ID:", subject);
                return null;
            }
            return textBody;

        } catch (error) {
            throw new Error("Error fetching body content: " + error);
        }
    }

    //function for getting message id based on subject of an email
    async function getMessageid(subject) {

        console.log("starting to get message id for the subject:" + subject);
        //verify if the subject is passed
        if (!subject || subject.trim().length === 0) {
            console.error('subject not found, please pass the subject or check the subject value');
            return null;
        }

        try {
            const response = await nylas.messages.list({
                identifier: config.grantId,
                queryParams: {
                    search_query_native: `subject:${subject}`,
                }
            });

        const messages = response?.data || [];

            if (!messages || messages.length === 0) {
                console.log("No messages found with subject:", subject);
                return null;
            }
            // return latest message
            const messageid = messages[0].id;

            if (!messageid) {
                console.error("No message id found for subject:", subject);
                return null;
            }
            console.log("Found message id:", messageid);
            return messageid;
        }
        catch (error) {
            console.error("Error fetching message ID:", error);
        }
    }

    // function for getting attachment id based on message id
    async function getAttachmentID(messageId) {
        if (!messageId) {
            throw new Error("getAttachmentID: messageId is required.");
        }

        try {
            console.log(`Fetching attachment metadata for messageId=${messageId}`);
            const attachments = await getAttachmentMetadata(messageId);

            if (!attachments || attachments.length === 0) {
                console.warn(`No attachments found for messageId=${messageId}`);
                return null;
            }

            const attachmentId = attachments[0]?.id;

            if (!attachmentId) {
                throw new Error(`Attachment metadata missing 'id' for messageId=${messageId}`);
            }

            console.log(`Found attachmentId=${attachmentId} for messageId=${messageId}`);
            return attachmentId;

        } catch (error) {
            console.error(`Error retrieving attachment ID for messageId=${messageId}: ${error.message}`);
            throw error;
        }
    }

    // function for downloading attachment
    async function downloadAttachment(subject) {
        if (!subject) {
            throw new Error("downloadAttachment: 'subject' is required but missing.");
        }

        const messageId = await getMessageid(subject);
        const attachmentId = await getAttachmentID(messageId);

        try {
            console.log(`[Nylas] Starting attachment download | messageId=${messageId} | attachmentId=${attachmentId}`);
            const attachment = await nylas.attachments.download({
                identifier: config.grantId,
                attachmentId : attachmentId,
                queryParams: {
                    messageId : messageId
                }
            });


            if (!attachment) {
                throw new Error(`[Nylas] Attachment returned null/undefined | messageId=${messageId} | attachmentId=${attachmentId}`);
            }
            console.log(`[Nylas] Successfully downloaded attachment | messageId=${messageId} | attachmentId=${attachmentId} | size=${attachment?.length || "unknown"} bytes`
            );
            return attachment;
        } catch (error) {
            console.error(`[Nylas] Failed to download attachment | messageId=${messageId} | attachmentId=${attachmentId}`);
            if (error?.response?.data) {
                console.error(`[Nylas] API Error Response:`, error.response.data);
            }
            console.error(`[Nylas] Full Error Stack:`, error.stack || error);
            throw new Error(`downloadAttachment failed for messageId=${messageId}, attachmentId=${attachmentId}. Reason: ${error.message}`);
        }
    }

    // Get all email parameters based on subject
    async function getAllParams(subject) {

        console.log("Starting to get all params for subject: " + subject);

        try {
            // Validate input
            if (!subject || subject.trim().length === 0) {
                console.error("Invalid subject. Please provide a valid subject string.");
                return null;
            }

            // Step 1: Retrieve message ID
            const messageid = await getMessageid(subject);
            if (!messageid) {
                console.error("No message ID found for subject: " + subject);
                return null;
            }

            // Step: Retrieve body content
            const bodyContent = await getBodyContent(subject);
            if (!bodyContent) {
                console.warn("No body content found for subject: " + subject);
            }

            // Step: Find the message using subject
            const message = await searchBySubject(subject, 1);
            if (!message) {
                console.error("No email found for subject: " + subject);
                return null;
            }

            // Step: Retrieve attachment metadata
            const attachmentMetadata = await getAttachmentMetadata(messageid);
            if (!attachmentMetadata) {
                console.warn("No attachments found for message ID: " + messageid);
            }

            // Final structured response
            return {
                subject: message.subject || "",
                attachmentMetadata: attachmentMetadata || [],
                bodyContent: bodyContent || "",
            };

        } catch (error) {
            console.error("Error while getting all params for subject: " + subject, error);
            return null;
        }
    }

    return {
        listMessages,
        searchBySubject,
        getLatestEmail,
        waitForEmail,
        getAttachmentMetadata,
        getMessageid,
        getBodyContent,
        getAllParams,
        downloadAttachment,
        getAttachmentID
    };

}

module.exports = { getMailBox };
