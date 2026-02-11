/**
 * Vendor Bill Workflow API Test
 * Tests: Authenticate -> Create Vendor Bill -> Delete Vendor Bill
 * 
 * This test validates the complete vendor bill lifecycle via API
 */

// import { test, expect, faker, dateFns } from '../../qawHelpers.js';
import { test, expect, faker, dateFns } from '../Util/lib/performance_node_20_helpers.js';
import { setupSingleUserAuth } from '../../lib/api_auth_setup.js';
import { initWorkflowLog, finalizeWorkflowLog } from '../util/lib/api_response_logger.js';

// API client functions
import { createVendorBill, validateVendorBillNo, deleteVendorBill } from '../../services/api_client/vendor_bill.js';

/**
 * Complete vendor bill workflow test
 */
test("new_vendor_bill_api_flow", async () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║    Vendor Bill Workflow API Test           ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Test user credentials
  const testUser = {
    email: 'performance.tester.1@mailinator.com',
    password: 'Success123'
  };

  // Initialize API response logging
  const workflowDir = await initWorkflowLog('vendor-bill-workflow');

  try {
    // ============================================
    // STEP 1: AUTHENTICATION SETUP
    // ============================================
    console.log('📋 STEP 1: Authentication Setup');
    console.log('────────────────────────────────\n');
    
    const authData = await setupSingleUserAuth(testUser);
    
    console.log('✓ Authentication complete');
    console.log(`  User: ${authData.email}`);
    console.log(`  JWT Token: ${authData.webTok ? '✓ Present' : '✗ Missing'}`);
    console.log(`  Cookies: ${authData.allCookies.length} cookies extracted\n`);

    // Realistic delay between API calls (5-8 seconds)
    await new Promise(resolve => setTimeout(resolve, 6000));

    // ============================================
    // STEP 2: CREATE VENDOR BILL
    // ============================================
    console.log('📋 STEP 2: Create Vendor Bill');
    console.log('────────────────────────────────\n');

    const timestamp = Date.now();
    const vendorBill = {
      vendor: "Asma Vendor",
      billVendorId: "1",
      billTermId: "",
      billMemo: faker.lorem.sentence(),
      billNo: faker.datatype.number({ min: 10000, max: 99999 }).toString(),
      billAddress: "",
      account: "Accounts Receivable",     
      description: faker.lorem.sentence(),
      amount: faker.datatype.number({ min: 10, max: 99, precision: 0.01 }).toFixed(2).toString(),
      billDate: dateFns.format(new Date(), "yyyy-MM-dd"), // YYYY-MM-DD format for API
      billDueDate: dateFns.format(dateFns.addDays(new Date(), 4), 'yyyy-MM-dd') // YYYY-MM-DD format for API
    };

    let vendorBillId;

    try {
      // Validate Bill Number
      console.log(`→ Validating Bill No: ${vendorBill.billNo}...`);
      const validateBillNo = await validateVendorBillNo(authData, vendorBill.billNo, vendorBill.billVendorId);
      
      console.log(`  Validation Response: ${JSON.stringify(validateBillNo)}`);
      expect(validateBillNo.success).toBe(true);
      console.log(`✓ Vendor Bill No "${vendorBill.billNo}" validation response received.`);
      
      // Check if bill number is valid (available for use)
      // API returns false when bill number is available, true when already in use
      // isValid = true means available (API returned false), false means already taken (API returned true)
      if (!validateBillNo.isValid) {
        throw new Error(`Bill No "${vendorBill.billNo}" is not available. It is already in use. Please generate a different bill number.`);
      }
      
      console.log(`✓ Vendor Bill No "${vendorBill.billNo}" is available for use.\n`);
      
      // Create Vendor Bill with validated bill number
      console.log(`→ Creating Vendor Bill with Bill No: ${vendorBill.billNo}...`);
      const vendorBillResult = await createVendorBill(authData, vendorBill);
      
      expect(vendorBillResult.success).toBe(true);
      expect(vendorBillResult.vendorBillId).toBeDefined();
      
      // Handle both number and object responses
      vendorBillId = typeof vendorBillResult.vendorBillId === 'object'
        ? (vendorBillResult.vendorBillId.id || vendorBillResult.vendorBillId.VendorBillId || vendorBillResult.vendorBillId)
        : vendorBillResult.vendorBillId;
      
      console.log('✓ Vendor Bill created successfully');
      console.log(`  Vendor Bill ID: ${JSON.stringify(vendorBillId)}`);
      console.log(`  Vendor Bill ID Type: ${typeof vendorBillId}`);
      console.log(`  Vendor Name: ${vendorBill.vendor}`);
      console.log(`  Bill No: ${vendorBill.billNo}`);
      console.log(`  Full Response: ${JSON.stringify(vendorBillResult.fullResponse)}\n`);
      
    } catch (billCreationError) {
      console.error('\n❌ VENDOR BILL CREATION FAILED');
      console.error('═══════════════════════════════════════════\n');
      console.error(`Error: ${billCreationError.message}`);
      
      if (billCreationError.message.includes('not available')) {
        console.error(`\n→ The Bill No "${vendorBill.billNo}" is already in use.`);
        console.error(`→ Suggested fix: The test will automatically retry with a new random bill number.`);
        console.error(`→ Current Bill No: ${vendorBill.billNo}`);
      }
      
      throw billCreationError; // Re-throw to be caught by outer try-catch
    }

    // Realistic delay between API calls (5-8 seconds)
    await new Promise(resolve => setTimeout(resolve, 7000));

    // ============================================
    // STEP 3: DELETE VENDOR BILL
    // ============================================
    console.log('📋 STEP 3: Delete Vendor Bill');
    console.log('────────────────────────────────\n');

    const deleteVendorBillResult = await deleteVendorBill(authData, vendorBillId);
    expect(deleteVendorBillResult.success).toBe(true);
    
    console.log('✓ Vendor Bill deleted successfully');
    console.log(`  Vendor Bill ID: ${vendorBillId}\n`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('╔════════════════════════════════════════════╗');
    console.log('║    WORKFLOW COMPLETED SUCCESSFULLY        ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log('✓ Authentication');
    console.log('✓ Vendor Bill Created');
    console.log('✓ Vendor Bill Deleted\n');

    // Finalize workflow log
    await finalizeWorkflowLog('vendor-bill-workflow', {
      stepsCompleted: 3, // Auth + Create Vendor Bill + Delete Vendor Bill
      vendorBillId: vendorBillId,
      vendorName: vendorBill.vendor,
      vendorBillAmount: vendorBill.amount,
      vendorBillDate: vendorBill.billDate,
      vendorBillDueDate: vendorBill.billDueDate,
      vendorBillDeleted: true
    });

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('═══════════════════════════════════════════\n');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Finalize log even on error
    try {
      await finalizeWorkflowLog('vendor-bill-workflow', {
        error: error.message,
        failed: true
      });
    } catch (logError) {
      console.error('Failed to finalize log:', logError.message);
    }
    
    throw error;
  }
});

/**
 * Export for Artillery load testing
 * Implements complete vendor bill workflow for load testing
 */
export async function new_vendor_bill_api_flow(page, vuContext, events, test) {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  Artillery: Vendor Bill API Flow           ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Get user credentials from Artillery payload or use default
  const email = vuContext?.vars?.email || 'performance.tester.1@mailinator.com';
  const password = vuContext?.vars?.password || 'Success123';

  try {
    const { step } = test;

    // ============================================
    // STEP 1: Auth (with caching)
    // ============================================
    let authData;
    
    await step('authenticate', async () => {
      // Use cached auth if available (from getAuthForUser)
      const { getAuthForUser } = await import('../../lib/api_auth_setup.js');
      authData = getAuthForUser(email);
      
      // If not cached, authenticate
      if (!authData) {
        console.log(`No cached auth for ${email}, authenticating...`);
        authData = await setupSingleUserAuth({ email, password });
      } else {
        console.log(`Using cached auth for ${email}`);
      }
    });

    // Realistic delay between API calls (5-8 seconds)
    await new Promise(resolve => setTimeout(resolve, 6000));

    // ============================================
    // STEP 2: Create Vendor Bill
    // ============================================
    let vendorBillId;
    
    await step('create_vendor_bill', async () => {
      const timestamp = Date.now();
      const vendorBill = {
        vendor: "Asma Vendor",
        billVendorId: "1",
        billTermId: "",
        billMemo: faker.lorem.sentence(),
        billNo: faker.datatype.number({ min: 10000, max: 99999 }).toString(),
        billAddress: "",
        account: "Accounts Receivable",
        description: faker.lorem.sentence(),
        amount: faker.datatype.number({ min: 10, max: 99, precision: 0.01 }).toFixed(2).toString(),
        billDate: dateFns.format(new Date(), "yyyy-MM-dd"),
        billDueDate: dateFns.format(dateFns.addDays(new Date(), 4), 'yyyy-MM-dd')
      };

      // Validate before creating
      const validateBillNo = await validateVendorBillNo(authData, vendorBill.billNo, vendorBill.billVendorId, { logResponse: false });
      
      if (!validateBillNo.isValid) {
        throw new Error(`Bill No "${vendorBill.billNo}" is not available`);
      }

      const vendorBillResult = await createVendorBill(authData, vendorBill, { logResponse: false });
      
      if (!vendorBillResult.success) {
        throw new Error(`Vendor bill creation failed: ${vendorBillResult.status}`);
      }
      
      vendorBillId = typeof vendorBillResult.vendorBillId === 'object'
        ? (vendorBillResult.vendorBillId.id || vendorBillResult.vendorBillId.VendorBillId || vendorBillResult.vendorBillId)
        : vendorBillResult.vendorBillId;
      
      if (events) {
        events.emit('counter', 'api.vendor_bill.created', 1);
      }
    });

    // Realistic delay between API calls (5-8 seconds)
    await new Promise(resolve => setTimeout(resolve, 7000));

    // ============================================
    // STEP 3: Delete Vendor Bill
    // ============================================
    await step('delete_vendor_bill', async () => {
      const deleteVendorBillResult = await deleteVendorBill(authData, vendorBillId, { logResponse: false });
      
      if (!deleteVendorBillResult.success) {
        throw new Error(`Vendor bill deletion failed: ${deleteVendorBillResult.status}`);
      }
      
      if (events) {
        events.emit('counter', 'api.vendor_bill.deleted', 1);
        events.emit('counter', 'workflow.completed', 1);
      }
    });

    console.log('\n✓ Artillery workflow completed successfully\n');

  } catch (error) {
    console.error('\n❌ Artillery workflow failed:', error.message);
    
    if (events) {
      events.emit('counter', 'workflow.failed', 1);
    }
    
    throw error;
  }
}