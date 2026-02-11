/**
 * Contacts API Client
 * Provides functions for contact-related API operations
 */

import { apiPost, apiGet, apiPut, apiDelete, parseResponseBody, isResponseSuccess } from '../../lib/api_request_helper.js';

/**
 * Create a person contact via API
 * Based on the API pattern from your test code
 * 
 * @param {Object} authData - Auth data from performanceApiLogIn
 * @param {Object} contactData - Contact information
 * @param {String} contactData.FirstName - Required
 * @param {String} contactData.LastName - Required
 * @param {String} contactData.ActiveStatusId - Default: '1' (active)
 * @param {String} contactData.Email - Optional
 * @param {String} contactData.Phone - Optional
 * @returns {Promise<Object>} API response with contact details
 */
export async function createPersonContact(authData, contactData) {
  // Build form payload matching API requirements
  const payload = {
    FirstName: contactData.FirstName,
    LastName: contactData.LastName,
    ActiveStatusId: contactData.ActiveStatusId || '1',
    CompanyId: contactData.CompanyId || '',
    EmailList: contactData.EmailList || '[]',
    WebsiteList: contactData.WebsiteList || '[]',
    PhoneList: contactData.PhoneList || '[]',
    IMList: contactData.IMList || '[]',
    AddressList: contactData.AddressList || '[]',
    ConsolidateInvoices: contactData.ConsolidateInvoices || 'false',
    TransferSurcharge: contactData.TransferSurcharge || 'false',
    ChargeInterest: contactData.ChargeInterest || 'false',
    Tags: contactData.Tags || '[]',
    TimeEntryRuleList: contactData.TimeEntryRuleList || '[]'
  };

  console.log(`\n→ Creating person contact: ${contactData.FirstName} ${contactData.LastName}`);

  const { response, body } = await apiPost(
    '/api2/contact/person',
    authData,
    payload,
    { contentType: 'form' }
  );
  
  if (!isResponseSuccess(response)) {
    console.error(`✗ Failed to create contact (${response.status()}):`, body);
    throw new Error(`Failed to create contact: ${response.status()} ${response.statusText()}`);
  }

  console.log(`✓ Contact created successfully`);
  console.log(`  Response:`, typeof body === 'string' ? body.substring(0, 200) : body);

  return {
    success: true,
    status: response.status(),
    data: body
  };
}

/**
 * Create a company contact via API
 * 
 * @param {Object} authData - Auth data from performanceApiLogIn
 * @param {Object} contactData - Company information
 * @param {String} contactData.Name - Company name (required)
 * @returns {Promise<Object>} API response with contact details
 */
export async function createCompanyContact(authData, contactData) {
  const payload = {
    Name: contactData.Name,
    ActiveStatusId: contactData.ActiveStatusId || '1',
    EmailList: contactData.EmailList || '[]',
    WebsiteList: contactData.WebsiteList || '[]',
    PhoneList: contactData.PhoneList || '[]',
    IMList: contactData.IMList || '[]',
    AddressList: contactData.AddressList || '[]',
    ConsolidateInvoices: contactData.ConsolidateInvoices || 'false',
    TransferSurcharge: contactData.TransferSurcharge || 'false',
    ChargeInterest: contactData.ChargeInterest || 'false',
    Tags: contactData.Tags || '[]'
  };

  console.log(`\n→ Creating company contact: ${contactData.Name}`);

  const { response, body } = await apiPost(
    '/api2/contact/company',
    authData,
    payload,
    { contentType: 'form' }
  );
  
  if (!isResponseSuccess(response)) {
    console.error(`✗ Failed to create company (${response.status()}):`, body);
    throw new Error(`Failed to create company: ${response.status()} ${response.statusText()}`);
  }

  console.log(`✓ Company created successfully`);

  return {
    success: true,
    status: response.status(),
    data: body
  };
}

/**
 * Get contact by ID
 * 
 * @param {Object} authData - Auth data
 * @param {String} contactId - Contact ID
 * @returns {Promise<Object>} Contact details
 */
export async function getContact(authData, contactId) {
  console.log(`\n→ Fetching contact: ${contactId}`);

  const { response, body } = await apiGet(
    `/api2/contact/${contactId}`,
    authData
  );
  
  if (!isResponseSuccess(response)) {
    console.error(`✗ Failed to get contact (${response.status()}):`, body);
    throw new Error(`Failed to get contact: ${response.status()} ${response.statusText()}`);
  }

  console.log(`✓ Contact fetched successfully`);

  return {
    success: true,
    status: response.status(),
    data: body
  };
}

/**
 * Delete contact by ID
 * 
 * @param {Object} authData - Auth data
 * @param {String} contactId - Contact ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteContact(authData, contactId) {
  console.log(`\n→ Deleting contact: ${contactId}`);

  const { response, body } = await apiDelete(
    `/api2/contact/${contactId}`,
    authData
  );
  
  if (!isResponseSuccess(response)) {
    console.error(`✗ Failed to delete contact (${response.status()}):`, body);
    throw new Error(`Failed to delete contact: ${response.status()} ${response.statusText()}`);
  }

  console.log(`✓ Contact deleted successfully`);

  return {
    success: true,
    status: response.status(),
    data: body
  };
}
