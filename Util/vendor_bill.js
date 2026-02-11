/**
 * Vendor Bills API Client
 * Provides functions for vendor bill-related API operations
 */

import { apiPost, apiGet, apiDelete, parseResponseBody, isResponseSuccess } from '../../lib/api_request_helper.js';
import { logAPIResponse } from '../../lib/api_response_logger.js';

/**
 * Validate vendor bill number
 * 
 * @param {Object} authData - Auth data from setupSingleUserAuth
 * @param {String|Number} billNo - Bill number to validate
 * @param {String|Number} billVendorId - Vendor ID (required, default: '1')
 * @param {Object} options - Additional options
 * @param {Boolean} options.logResponse - Whether to log response (default: true)
 * @returns {Promise<Object>} API response with validation result
 */
export async function validateVendorBillNo(authData, billNo, billVendorId = '1', options = {}) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   ✓ VALIDATE VENDOR BILL NO API CALL    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n→ Bill No: ${billNo}`);
  console.log(`→ Vendor ID: ${billVendorId}`);

  const startTime = Date.now();

  const { response, body } = await apiGet(
    `/api2/VendorBill/ValidateVendorNo?BillNo=${billNo}&BillVendorId=${billVendorId}`,
    authData
  );
  
  const responseTime = Date.now() - startTime;

  if (!isResponseSuccess(response)) {
    console.error(`\n❌ FAILED to validate vendor bill number (${response.status()})`);
    console.error(`→ Bill No: ${billNo}`);
    console.error(`→ Vendor ID: ${billVendorId}`);
    console.error(`→ Response:`, body);
    
    if (options.logResponse !== false) {
      await logAPIResponse('validate_vendor_bill_no', {
        method: 'GET',
        url: `/api2/VendorBill/ValidateVendorNo?BillNo=${billNo}&BillVendorId=${billVendorId}`,
        payload: { billNo, billVendorId }
      }, response, body, null, responseTime);
    }
    
    throw new Error(`Failed to validate vendor bill number: ${response.status()} ${response.statusText()}`);
  }

  // API returns boolean: false means bill number is available (valid), true means already in use
  const isValid = body === false;
  const isAvailable = body === false;

  console.log(`\n✓ Vendor bill number validated!`);
  console.log(`  API Response: ${body}`);
  console.log(`  Is Valid (Available): ${isValid}`);
  console.log(`  Response Time: ${responseTime}ms`);
  console.log('═══════════════════════════════════════════\n');

  if (options.logResponse !== false) {
    await logAPIResponse('validate_vendor_bill_no', {
      method: 'GET',
      url: `/api2/VendorBill/ValidateVendorNo?BillNo=${billNo}&BillVendorId=${billVendorId}`,
      payload: { billNo, billVendorId }
    }, response, body, { isValid, isAvailable }, responseTime);
  }

  return {
    success: true,
    status: response.status(),
    isValid: isValid,
    isAvailable: isAvailable,
    data: body,
    responseTime
  };
}

/**
 * Create a vendor bill via API
 * 
 * @param {Object} authData - Auth data from setupSingleUserAuth
 * @param {Object} vendorBillData - Vendor bill information
 * @param {String|Number} vendorBillData.billVendorId - Vendor ID (default: '1')
 * @param {String} vendorBillData.billDate - Bill date in YYYY-MM-DD format (default: today)
 * @param {String} vendorBillData.billDueDate - Bill due date in YYYY-MM-DD format (default: today + 4 days)
 * @param {String|Number} vendorBillData.billNo - Bill number (default: random 3-digit number)
 * @param {String} vendorBillData.billAddress - Bill address (default: '')
 * @param {Array} vendorBillData.billDetails - Array of bill detail objects (default: single item with placeholder)
 * @param {Array} vendorBillData.documents - Array of document objects (default: empty array)
 * @param {Object} options - Additional options
 * @param {Boolean} options.logResponse - Whether to log response (default: true)
 * @param {Boolean} options.validateBillNo - Whether to validate bill number before creation (default: true)
 * @returns {Promise<Object>} API response with vendor bill ID
 */
export async function createVendorBill(authData, vendorBillData = {}, options = {}) {
  const timestamp = Date.now();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dueDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 4 days from now
  const randomBillNo = Math.floor(100 + Math.random() * 900).toString(); // Random 3-digit number
  
  // Build default bill details if not provided
  const defaultBillDetails = [{
    descriptionCssClass: '',
    id: 0,
    index: 1,
    accountId: vendorBillData.accountId || 1312090,
    accountName: vendorBillData.accountName || 'placeholderaccount',
    description: vendorBillData.description || `API Test Vendor Bill ${timestamp}`,
    amount: vendorBillData.amount || '10',
    matterId: '',
    PIExpenseId: null,
    piExpenseAmount: null,
    matterName: '',
    billable: false,
    isPreloadedDetailData: false,
    officeId: vendorBillData.officeId || 2919,
    officeName: '',
    isDeleted: false,
    templateName: 'vb-details-show-template',
    justCreated: true,
    isEdited: false,
    isInital: true,
    isEditMode: true,
    taskCodeList: [],
    isMatterUtbms: false,
    isMatterPIEnabled: false,
    matterDrpClass: 'rps-vb-matter-drp-wide',
    userId: authData.userId || 31152,
    invoicedStatusId: 0,
    piExpenseDate: null,
    matterContacts: []
  }];

  // Build form payload
  const billVendorId = vendorBillData.billVendorId || '1';
  const billNo = vendorBillData.billNo || randomBillNo;
  const billDate = vendorBillData.billDate || today;
  const billDueDate = vendorBillData.billDueDate || dueDate;
  const billAddress = vendorBillData.billAddress || '';
  const billDetails = vendorBillData.billDetails || defaultBillDetails;
  const documents = vendorBillData.documents || [];

  // Step 1: Validate bill number (optional)
  if (options.validateBillNo !== false) {
    try {
      await validateVendorBillNo(authData, billNo, billVendorId, { logResponse: options.logResponse });
    } catch (error) {
      console.warn(`⚠️ Bill number validation failed (continuing anyway): ${error.message}`);
    }
  }

  // Step 2: Create vendor bill
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║      📄 CREATE VENDOR BILL API CALL      ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n→ Vendor ID: ${billVendorId}`);
  console.log(`→ Bill No: ${billNo}`);
  console.log(`→ Bill Date: ${billDate}`);
  console.log(`→ Due Date: ${billDueDate}`);
  console.log(`→ Bill Details: ${billDetails.length} item(s)`);

  const startTime = Date.now();

  // Build form data payload
  const payload = {
    billVendorId: billVendorId,
    billDate: billDate,
    billDueDate: billDueDate,
    billNo: billNo,
    billAddress: billAddress,
    billDetails: JSON.stringify(billDetails),
    documents: JSON.stringify(documents)
  };

  const { response, body } = await apiPost(
    '/api2/vendorbill/',
    authData,
    payload,
    { contentType: 'form' }
  );
  
  const responseTime = Date.now() - startTime;

  if (!isResponseSuccess(response)) {
    console.error(`\n❌ FAILED to create vendor bill (${response.status()})`);
    console.error(`Response:`, body);
    
    if (options.logResponse !== false) {
      await logAPIResponse('create_vendor_bill', {
        method: 'POST',
        url: '/api2/vendorbill/',
        payload
      }, response, body, null, responseTime);
    }
    
    throw new Error(`Failed to create vendor bill: ${response.status()} ${response.statusText()}`);
  }

  // Response parsing - handle multiple possible formats
  let vendorBillId;
  
  if (typeof body === 'number') {
    // Direct number response
    vendorBillId = body;
  } else if (typeof body === 'object' && body !== null) {
    // Object response - try common property names
    vendorBillId = body.id || body.VendorBillId || body.vendorBillId || body.billId || body.Id;
    
    if (!vendorBillId) {
      console.warn('⚠️ Could not extract vendor bill ID from response object:', JSON.stringify(body));
      console.warn('⚠️ Using entire response object as ID');
      vendorBillId = body;
    }
  } else {
    vendorBillId = body;
  }
  
  console.log(`\n✓ Vendor bill created successfully!`);
  console.log(`  Vendor Bill ID: ${JSON.stringify(vendorBillId)}`);
  console.log(`  Vendor Bill ID Type: ${typeof vendorBillId}`);
  console.log(`  Bill No: ${billNo}`);
  console.log(`  Vendor ID: ${billVendorId}`);
  console.log(`  Full Response: ${JSON.stringify(body)}`);
  console.log(`  Response Time: ${responseTime}ms`);
  console.log('═══════════════════════════════════════════\n');

  // Log response for documentation
  if (options.logResponse !== false) {
    await logAPIResponse('create_vendor_bill', {
      method: 'POST',
      url: '/api2/vendorbill/',
      payload
    }, response, body, { vendorBillId, billNo, billVendorId, fullResponse: body }, responseTime);
  }

  return {
    success: true,
    status: response.status(),
    vendorBillId: vendorBillId,
    billNo: billNo,
    billVendorId: billVendorId,
    data: body,
    fullResponse: body,
    responseTime
  };
}

/**
 * Delete a vendor bill via API
 * 
 * @param {Object} authData - Auth data from setupSingleUserAuth
 * @param {Number|String} vendorBillId - Vendor bill ID to delete
 * @param {Object} options - Additional options
 * @param {Boolean} options.logResponse - Whether to log response (default: true)
 * @returns {Promise<Object>} API response with deletion result
 */
export async function deleteVendorBill(authData, vendorBillId, options = {}) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║    🗑️  DELETE VENDOR BILL API CALL       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n→ Vendor Bill ID: ${vendorBillId}`);

  const startTime = Date.now();

  // Extract numeric ID if it's an object
  let numericId = vendorBillId;
  if (typeof vendorBillId === 'object' && vendorBillId !== null) {
    numericId = vendorBillId.id || vendorBillId.VendorBillId || vendorBillId.vendorBillId || vendorBillId;
    console.log(`  Extracted numeric ID: ${numericId} from object`);
  }

  // Delete Vendor Bill - ID in URL path (not in body)
  // DELETE /api2/VendorBill/{id}
  const { response, body } = await apiDelete(
    `/api2/VendorBill/${numericId}`,
    authData
  );
  
  const responseTime = Date.now() - startTime;

  if (!isResponseSuccess(response)) {
    console.error(`\n❌ FAILED to delete vendor bill (${response.status()})`);
    console.error(`→ Vendor Bill ID: ${numericId}`);
    console.error(`→ Response:`, body);
    
    if (options.logResponse !== false) {
      await logAPIResponse('delete_vendor_bill', {
        method: 'DELETE',
        url: `/api2/VendorBill/${numericId}`,
        payload: null
      }, response, body, null, responseTime);
    }
    
    throw new Error(`Failed to delete vendor bill: ${response.status()} ${response.statusText()} - ID: ${numericId}`);
  }

  // Response should be boolean 'true' or success indicator
  const deletionSuccess = body === true || body?.success === true || response.status() === 200;
  
  console.log(`\n✓ Vendor bill deleted successfully!`);
  console.log(`  Vendor Bill ID: ${numericId}`);
  console.log(`  Response: ${JSON.stringify(body)}`);
  console.log(`  Response Time: ${responseTime}ms`);
  console.log('═══════════════════════════════════════════\n');

  // Log response for documentation
  if (options.logResponse !== false) {
    await logAPIResponse('delete_vendor_bill', {
      method: 'DELETE',
      url: `/api2/VendorBill/${numericId}`,
      payload: null
    }, response, body, { vendorBillId: numericId, deletionSuccess }, responseTime);
  }

  return {
    success: deletionSuccess,
    status: response.status(),
    vendorBillId: numericId,
    data: body,
    responseTime
  };
}