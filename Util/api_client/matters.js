/**
 * Matters API Client
 * Provides functions for matter-related API operations
 */

import { apiPost, apiDelete, parseResponseBody, isResponseSuccess } from '../../lib/api_request_helper.js';
import { logAPIResponse } from '../../lib/api_response_logger.js';

/**
 * Create a matter via API
 * 
 * @param {Object} authData - Auth data from performanceApiLogIn
 * @param {Object} matterData - Matter information
 * @param {String} matterData.MatterName - Matter name (required, can include timestamp)
 * @param {String} matterData.MatterOpenDate - Format: YYYY/MM/DD (default: today)
 * @param {String} matterData.MatterClientName - Client name (default: 'Pawnee Parks and Recreation')
 * @param {String} matterData.MatterClient - Client ID (default: '1398602')
 * @param {Object} options - Additional options
 * @param {Boolean} options.logResponse - Whether to log response (default: true)
 * @returns {Promise<Object>} API response with matter ID
 */
export async function createMatter(authData, matterData, options = {}) {
  const timestamp = Date.now();
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '/'); // YYYY/MM/DD
  
  // Build form payload with defaults matching captured API
  const payload = {
    // Required fields with sensible defaults
    MatterActiveStatusId: matterData.MatterActiveStatusId || '1',
    MatterName: matterData.MatterName || `API_Test_Matter_${timestamp}`,
    MatterOpenDate: matterData.MatterOpenDate || today,
    MatterStatusId: matterData.MatterStatusId || '1',
    
    // Practice Area (configurable but with defaults)
    MatterPracticeAreaId: matterData.MatterPracticeAreaId || '30548',
    MatterPracticeArea: matterData.MatterPracticeArea || 'Business Development',
    
    // Client Information (configurable but with defaults)
    MatterClientName: matterData.MatterClientName || 'Pawnee Parks and Recreation',
    MatterClient: matterData.MatterClient || '1398602',
    
    // User/Office IDs (configurable but with defaults)
    MatterAttorneyInchargeId: matterData.MatterAttorneyInchargeId || '34705',
    MatterOfficeId: matterData.MatterOfficeId || '2919',
    
    // Billing Configuration
    MatterBillingType: matterData.MatterBillingType || '1',
    MatterCurrencyId: matterData.MatterCurrencyId || '1',
    MatterIsFlatFeeAllocationEnabled: matterData.MatterIsFlatFeeAllocationEnabled || '0',
    MatterIncrement: matterData.MatterIncrement || '6',
    MatterIsRestricted: matterData.MatterIsRestricted || 'false',
    
    // JSON Arrays (as strings)
    AdditionalClientInMatterList: matterData.AdditionalClientInMatterList || '[]',
    CustomUserRates: matterData.CustomUserRates || '[]',
    Originators: matterData.Originators || '[]',
    Responsible: matterData.Responsible || '[]',
    SelectedUTBMS: matterData.SelectedUTBMS || '[]',
    
    // Additional Settings
    PreferredMethod: matterData.PreferredMethod || '0',
    SoftCostRevPercentage: matterData.SoftCostRevPercentage || '0.00',
    SplitBilling: matterData.SplitBilling || 'false',
    InvoicePrintTemplateId: matterData.InvoicePrintTemplateId || '3172',
    EnablePIModule: matterData.EnablePIModule || 'false',
    
    // Interest Settings
    ChargeInterest: matterData.ChargeInterest || 'false',
    InterestRate: matterData.InterestRate || '0',
    InterestType: matterData.InterestType || '0',
    InterestPeriod: matterData.InterestPeriod || '0',
    InterestGracePeriod: matterData.InterestGracePeriod || '0',
    
    // Time Entry Rules
    TimeEntryRuleIds: matterData.TimeEntryRuleIds || ''
  };

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       📁 CREATE MATTER API CALL          ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n→ Matter Name: ${payload.MatterName}`);
  console.log(`→ Client: ${payload.MatterClientName} (ID: ${payload.MatterClient})`);
  console.log(`→ Open Date: ${payload.MatterOpenDate}`);

  const startTime = Date.now();

  const { response, body } = await apiPost(
    '/api2/Matter/',
    authData,
    payload,
    { contentType: 'form' }
  );
  
  const responseTime = Date.now() - startTime;

  if (!isResponseSuccess(response)) {
    console.error(`\n❌ FAILED to create matter (${response.status()})`);
    console.error(`Response:`, body);
    
    if (options.logResponse !== false) {
      await logAPIResponse('create_matter', {
        method: 'POST',
        url: '/api2/Matter/',
        payload
      }, response, body, null, responseTime);
    }
    
    throw new Error(`Failed to create matter: ${response.status()} ${response.statusText()}`);
  }

  // CRITICAL: Response is a NUMBER (Matter ID), not an object
  const matterId = body;
  
  console.log(`\n✓ Matter created successfully!`);
  console.log(`  Matter ID: ${matterId}`);
  console.log(`  Response Type: ${typeof matterId}`);
  console.log(`  Response Time: ${responseTime}ms`);
  console.log('═══════════════════════════════════════════\n');

  // Log response for documentation
  if (options.logResponse !== false) {
    await logAPIResponse('create_matter', {
      method: 'POST',
      url: '/api2/Matter/',
      payload
    }, response, body, { matterId }, responseTime);
  }

  return {
    success: true,
    status: response.status(),
    matterId: matterId,
    data: body,
    responseTime
  };
}

/**
 * Delete a matter via API
 * Note: Delete Matter API uses JSON content-type with MatterId in body
 * 
 * @param {Object} authData - Auth data from performanceApiLogIn
 * @param {Number|String} matterId - Matter ID to delete
 * @param {Object} options - Additional options
 * @param {Boolean} options.logResponse - Whether to log response (default: true)
 * @returns {Promise<Object>} API response with deletion result
 */
export async function deleteMatter(authData, matterId, options = {}) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       🗑️  DELETE MATTER API CALL         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n→ Matter ID: ${matterId}`);

  const startTime = Date.now();

  // Delete Matter uses JSON content-type with MatterId in body
  const { response, body } = await apiDelete(
    '/api2/DeleteMatter',
    authData,
    {
      data: { MatterId: parseInt(matterId) },  // JSON payload with MatterId
      extraHeaders: { 'content-type': 'application/json' }
    }
  );
  
  const responseTime = Date.now() - startTime;

  if (!isResponseSuccess(response)) {
    console.error(`\n❌ FAILED to delete matter (${response.status()})`);
    console.error(`Response:`, body);
    
    if (options.logResponse !== false) {
      await logAPIResponse('delete_matter', {
        method: 'DELETE',
        url: '/api2/DeleteMatter',
        payload: { MatterId: parseInt(matterId) }
      }, response, body, null, responseTime);
    }
    
    throw new Error(`Failed to delete matter: ${response.status()} ${response.statusText()}`);
  }

  // Response should be boolean 'true'
  const deletionSuccess = body === true;
  
  console.log(`\n✓ Matter deleted successfully!`);
  console.log(`  Matter ID: ${matterId}`);
  console.log(`  Response: ${body}`);
  console.log(`  Response Time: ${responseTime}ms`);
  console.log('═══════════════════════════════════════════\n');

  // Log response for documentation
  if (options.logResponse !== false) {
    await logAPIResponse('delete_matter', {
      method: 'DELETE',
      url: '/api2/DeleteMatter',
      payload: { MatterId: parseInt(matterId) }
    }, response, body, { matterId, deletionSuccess }, responseTime);
  }

  return {
    success: deletionSuccess,
    status: response.status(),
    matterId: matterId,
    data: body,
    responseTime
  };
}
