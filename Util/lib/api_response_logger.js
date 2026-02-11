/**
 * API Response Logger
 * Captures API request/response data for documentation and debugging
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Base directory for API logs
const API_LOGS_BASE_DIR = process.env.API_LOGS_DIR || join(process.cwd(), 'captured-api-traffic');

// Current workflow session
let currentWorkflowDir = null;
let currentWorkflowLogs = [];

/**
 * Initialize a new workflow logging session
 * Creates timestamped directory for this workflow run
 * 
 * @param {String} workflowName - Name of the workflow (e.g., 'time-entry-workflow')
 * @returns {Promise<String>} Path to workflow directory
 */
export async function initWorkflowLog(workflowName) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const workflowDir = join(API_LOGS_BASE_DIR, workflowName, timestamp);
  
  // Create directory if it doesn't exist
  if (!existsSync(workflowDir)) {
    await mkdir(workflowDir, { recursive: true });
  }
  
  currentWorkflowDir = workflowDir;
  currentWorkflowLogs = [];
  
  console.log(`\n📝 API Logging initialized: ${workflowDir}\n`);
  
  return workflowDir;
}

/**
 * Sanitize headers - remove sensitive data
 * 
 * @param {Object} headers - Headers object
 * @returns {Object} Sanitized headers
 */
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  
  // Mask authorization token
  if (sanitized.authorization) {
    sanitized.authorization = 'Bearer [REDACTED]';
  }
  
  // Mask cookies but keep structure
  if (sanitized.Cookie) {
    const cookies = sanitized.Cookie.split('; ');
    sanitized.Cookie = cookies.map(c => {
      const [name] = c.split('=');
      return `${name}=[REDACTED]`;
    }).join('; ');
  }
  
  return sanitized;
}

/**
 * Log API request and response
 * Saves to file and adds to workflow summary
 * 
 * @param {String} stepName - Name of the API step (e.g., 'create_matter')
 * @param {Object} request - Request details
 * @param {String} request.method - HTTP method
 * @param {String} request.url - Request URL
 * @param {Object} request.payload - Request payload (optional)
 * @param {Object} request.data - Request data (optional, for DELETE)
 * @param {Object} response - Playwright APIResponse object
 * @param {Any} responseBody - Parsed response body
 * @param {Object} extractedData - Any data extracted from response (e.g., IDs)
 * @param {Number} responseTime - Response time in milliseconds
 * @returns {Promise<void>}
 */
export async function logAPIResponse(stepName, request, response, responseBody, extractedData = null, responseTime = 0) {
  const timestamp = new Date().toISOString();
  
  // Build log entry
  const logEntry = {
    step: stepName,
    timestamp,
    request: {
      method: request.method,
      url: request.url,
      headers: sanitizeHeaders(request.headers || {}),
      payload: request.payload || null,
      data: request.data || null
    },
    response: {
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers ? response.headers() : {}, // headers() returns object directly
      body: responseBody,
      responseTime: `${responseTime}ms`
    },
    extractedData: extractedData || {}
  };
  
  // Add to workflow logs
  currentWorkflowLogs.push(logEntry);
  
  // Write individual step log file
  if (currentWorkflowDir) {
    const stepNumber = String(currentWorkflowLogs.length).padStart(2, '0');
    const filename = `${stepNumber}-${stepName}.json`;
    const filepath = join(currentWorkflowDir, filename);
    
    try {
      await writeFile(filepath, JSON.stringify(logEntry, null, 2), 'utf-8');
      console.log(`  💾 Logged to: ${filename}`);
    } catch (error) {
      console.error(`  ⚠️  Failed to write log file: ${error.message}`);
    }
  }
}

/**
 * Finalize workflow log
 * Creates summary file with all API calls
 * 
 * @param {String} workflowName - Name of the workflow
 * @param {Object} summary - Summary data (optional)
 * @returns {Promise<void>}
 */
export async function finalizeWorkflowLog(workflowName, summary = {}) {
  if (!currentWorkflowDir || currentWorkflowLogs.length === 0) {
    console.log('\n⚠️  No workflow logs to finalize\n');
    return;
  }
  
  const summaryData = {
    workflow: workflowName,
    totalSteps: currentWorkflowLogs.length,
    startTime: currentWorkflowLogs[0]?.timestamp,
    endTime: currentWorkflowLogs[currentWorkflowLogs.length - 1]?.timestamp,
    summary: summary,
    steps: currentWorkflowLogs.map((log, index) => ({
      step: index + 1,
      name: log.step,
      method: log.request.method,
      url: log.request.url,
      status: log.response.status,
      responseTime: log.response.responseTime,
      extractedData: log.extractedData
    }))
  };
  
  const summaryFilepath = join(currentWorkflowDir, 'summary.json');
  
  try {
    await writeFile(summaryFilepath, JSON.stringify(summaryData, null, 2), 'utf-8');
    
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║     📊 WORKFLOW LOG FINALIZED            ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`\n  Directory: ${currentWorkflowDir}`);
    console.log(`  Total Steps: ${summaryData.totalSteps}`);
    console.log(`  Files Created:`);
    for (let i = 0; i < currentWorkflowLogs.length; i++) {
      const stepNum = String(i + 1).padStart(2, '0');
      console.log(`    ${stepNum}-${currentWorkflowLogs[i].step}.json`);
    }
    console.log(`    summary.json`);
    console.log('\n═══════════════════════════════════════════\n');
  } catch (error) {
    console.error(`\n⚠️  Failed to write summary file: ${error.message}\n`);
  }
  
  // Reset for next workflow
  currentWorkflowDir = null;
  currentWorkflowLogs = [];
}

/**
 * Get current workflow directory
 * 
 * @returns {String|null} Current workflow directory path
 */
export function getCurrentWorkflowDir() {
  return currentWorkflowDir;
}

/**
 * Get all workflow logs
 * 
 * @returns {Array} Array of log entries
 */
export function getWorkflowLogs() {
  return [...currentWorkflowLogs];
}
