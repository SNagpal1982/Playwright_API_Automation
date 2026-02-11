/**
 * Time Entries API Client
 * Provides functions for time entry-related API operations
 */

import { apiPost, apiDelete, parseResponseBody, isResponseSuccess } from '../../lib/api_request_helper.js';
import { logAPIResponse } from '../../lib/api_response_logger.js';

/**
 * Create a time entry via API
 * 
 * @param {Object} authData - Auth data from performanceApiLogIn
 * @param {Object} timeEntryData - Time entry information
 * @param {Number|String} timeEntryData.tien_matterid - Matter ID (REQUIRED)
 * @param {Number} timeEntryData.tien_duration - Duration in seconds (REQUIRED)
 * @param {String} timeEntryData.tien_workdate - Format: MM/DD/YYYY h:mm AM/PM (default: now)
 * @param {String} timeEntryData.tien_matteruserid - User ID (default: '34701')
 * @param {Object} options - Additional options
 * @param {Boolean} options.logResponse - Whether to log response (default: true)
 * @returns {Promise<Object>} API response with time entry details
 */
export async function createTimeEntry(authData, timeEntryData, options = {}) {
  // Validate required fields
  if (!timeEntryData.tien_matterid) {
    throw new Error('tien_matterid is required for creating time entry');
  }

  const timestamp = Date.now();
  const now = new Date();
  const defaultWorkDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
  
  // Default duration: 1.5 hours = 5400 seconds
  const defaultDuration = '5400';
  
  // Build form payload with defaults matching captured API
  const payload = {
    // REQUIRED: Matter ID (from previous step)
    tien_matterid: String(timeEntryData.tien_matterid),
    
    // User Configuration (configurable but with defaults)
    tien_matteruserid: timeEntryData.tien_matteruserid || '34701',
    
    // Time Type
    tien_timetype: timeEntryData.tien_timetype || '2',
    
    // Date/Time
    tien_workdate: timeEntryData.tien_workdate || defaultWorkDate,
    
    // Duration (in seconds)
    tien_duration: timeEntryData.tien_duration || defaultDuration,
    tien_actualduration: timeEntryData.tien_actualduration || timeEntryData.tien_duration || defaultDuration,
    
    // Work Type (configurable but with defaults)
    tien_worktypeid: timeEntryData.tien_worktypeid || '5897',
    tien_worktypeIsUTBMS: timeEntryData.tien_worktypeIsUTBMS || 'false',
    
    // Billing Information
    tien_rate: timeEntryData.tien_rate || '20.00', // Default rate $20/hour
    tien_description: timeEntryData.tien_description || '', // Description field
    tien_total: timeEntryData.tien_total || '123',
    
    // Flags
    tien_isHiustorical: timeEntryData.tien_isHiustorical || 'false', // [sic] - typo in API
    tien_isNoCharge: timeEntryData.tien_isNoCharge !== undefined ? timeEntryData.tien_isNoCharge : 'false', // Default to billable
    tien_isNcds: timeEntryData.tien_isNcds || 'false',
    tien_isAdmin: timeEntryData.tien_isAdmin || 'false',
    tien_isSplit: timeEntryData.tien_isSplit || 'false',
    
    // Split Configuration
    tien_splitUsers: timeEntryData.tien_splitUsers || '[]',
    
    // Allocation
    ExcludeFromAllocation: timeEntryData.ExcludeFromAllocation || 'false'
  };

  // Calculate hours for display
  const durationSeconds = parseInt(payload.tien_duration);
  const durationHours = (durationSeconds / 3600).toFixed(2);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║    ⏱️  CREATE TIME ENTRY API CALL        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n→ Matter ID: ${payload.tien_matterid}`);
  console.log(`→ Duration: ${durationHours} hours (${durationSeconds} seconds)`);
  console.log(`→ Work Date: ${payload.tien_workdate}`);
  console.log(`→ No Charge: ${payload.tien_isNoCharge}`);

  const startTime = Date.now();

  const { response, body } = await apiPost(
    '/api2/time/',
    authData,
    payload,
    { contentType: 'form' }
  );
  
  const responseTime = Date.now() - startTime;

  if (!isResponseSuccess(response)) {
    console.error(`\n❌ FAILED to create time entry (${response.status()})`);
    console.error(`Response:`, body);
    
    if (options.logResponse !== false) {
      await logAPIResponse('create_time_entry', {
        method: 'POST',
        url: '/api2/time/',
        payload
      }, response, body, null, responseTime);
    }
    
    throw new Error(`Failed to create time entry: ${response.status()} ${response.statusText()}`);
  }

  // CRITICAL: Response is an OBJECT with tien_id property
  const timeEntryId = body.tien_id;
  
  if (!timeEntryId) {
    console.error(`\n⚠️  WARNING: Response does not contain tien_id`);
    console.error(`Response:`, body);
  }
  
  console.log(`\n✓ Time Entry created successfully!`);
  console.log(`  Time Entry ID: ${timeEntryId}`);
  console.log(`  Matter ID: ${payload.tien_matterid}`);
  console.log(`  Duration: ${durationHours} hours`);
  console.log(`  Response Time: ${responseTime}ms`);
  console.log('═══════════════════════════════════════════\n');

  // Log response for documentation
  if (options.logResponse !== false) {
    await logAPIResponse('create_time_entry', {
      method: 'POST',
      url: '/api2/time/',
      payload
    }, response, body, { 
      timeEntryId,
      matterId: payload.tien_matterid,
      durationHours
    }, responseTime);
  }

  return {
    success: true,
    status: response.status(),
    timeEntryId: timeEntryId,
    matterId: payload.tien_matterid,
    data: body,
    responseTime
  };
}

/**
 * Delete a time entry via API
 * 
 * @param {Object} authData - Auth data from performanceApiLogIn
 * @param {Number|String} timeEntryId - Time Entry ID to delete
 * @param {Object} options - Additional options
 * @param {Boolean} options.logResponse - Whether to log response (default: true)
 * @returns {Promise<Object>} API response with deletion result
 */
export async function deleteTimeEntry(authData, timeEntryId, options = {}) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║    🗑️  DELETE TIME ENTRY API CALL        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n→ Time Entry ID: ${timeEntryId}`);

  const startTime = Date.now();

  const { response, body } = await apiDelete(
    `/api2/Time/${timeEntryId}`,
    authData,
    { logResponse: options.logResponse }
  );
  
  const responseTime = Date.now() - startTime;

  if (!isResponseSuccess(response)) {
    console.error(`\n❌ FAILED to delete time entry (${response.status()})`);
    console.error(`Response:`, body);
    
    if (options.logResponse !== false) {
      await logAPIResponse('delete_time_entry', {
        method: 'DELETE',
        url: `/api2/Time/${timeEntryId}`
      }, response, body, null, responseTime);
    }
    
    throw new Error(`Failed to delete time entry: ${response.status()} ${response.statusText()}`);
  }

  console.log(`\n✓ Time Entry deleted successfully!`);
  console.log(`  Time Entry ID: ${timeEntryId}`);
  console.log(`  Response: ${JSON.stringify(body)}`);
  console.log(`  Response Time: ${responseTime}ms`);
  console.log('═══════════════════════════════════════════\n');

  // Log response for documentation
  if (options.logResponse !== false) {
    await logAPIResponse('delete_time_entry', {
      method: 'DELETE',
      url: `/api2/Time/${timeEntryId}`
    }, response, body, { timeEntryId }, responseTime);
  }

  return {
    success: true,
    status: response.status(),
    timeEntryId: timeEntryId,
    data: body,
    responseTime
  };
}
