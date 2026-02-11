/**
 * API Request Helper Module
 * Standardized API request functions with auth injection
 * Supports both form-encoded and JSON payloads
 */

import { request } from '@playwright/test';

/**
 * Get standard headers for API requests
 * Mimics browser requests for maximum compatibility
 * 
 * @param {Object} authData - Auth data from performanceApiLogIn
 * @param {String} contentType - 'form' or 'json'
 * @returns {Object} Headers object
 */
function getStandardHeaders(authData, contentType = 'form') {
  const headers = {
    'accept': 'application/json, text/javascript, */*; q=0.01',
    'x-requested-with': 'XMLHttpRequest',
    'svc-type': 'web',
    'Cookie': authData.cookieHeader
  };

  // Add Authorization header if JWT token available
  if (authData.webTok) {
    headers['authorization'] = `Bearer ${authData.webTok}`;
  }

  // Set content-type based on payload type
  if (contentType === 'form') {
    headers['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
  } else if (contentType === 'json') {
    headers['content-type'] = 'application/json';
  }

  return headers;
}

/**
 * Build full URL from relative or absolute path
 * 
 * @param {String} url - URL path (relative or absolute)
 * @param {String} baseUrl - Base URL from auth data
 * @returns {String} Full URL
 */
function buildFullUrl(url, baseUrl) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Ensure baseUrl doesn't end with / and url starts with /
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  
  return `${cleanBase}${cleanPath}`;
}

/**
 * Create API request context
 * Uses Playwright's standalone request context (no browser needed)
 * 
 * @returns {Promise<APIRequestContext>}
 */
async function createAPIContext() {
  return await request.newContext({
    ignoreHTTPSErrors: true // Handle self-signed certs in test environments
  });
}

/**
 * Make API POST request
 * 
 * @param {String} url - API endpoint path
 * @param {Object} authData - Auth data from performanceApiLogIn
 * @param {Object} payload - Request payload
 * @param {Object} options - Additional options
 * @param {String} options.contentType - 'form' or 'json' (default: 'form')
 * @param {Object} options.extraHeaders - Additional headers to merge
 * @returns {Promise<{response: APIResponse, body: any}>}
 */
export async function apiPost(url, authData, payload, options = {}) {
  const contentType = options.contentType || 'form';
  const extraHeaders = options.extraHeaders || {};
  
  const fullUrl = buildFullUrl(url, authData.baseUrl);
  const headers = {
    ...getStandardHeaders(authData, contentType),
    ...extraHeaders
  };

  const apiContext = await createAPIContext();
  
  try {
    const requestOptions = {
      headers,
      timeout: options.timeout || 30000
    };

    // Set payload based on content type
    if (contentType === 'form') {
      requestOptions.form = payload;
    } else {
      requestOptions.data = payload;
    }

    console.log(`→ POST ${fullUrl}`);
    const response = await apiContext.post(fullUrl, requestOptions);
    console.log(`← ${response.status()} ${response.statusText()}`);

    // CRITICAL: Read body BEFORE disposing context
    const body = await parseResponseBody(response);
    
    return { response, body };
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Make API GET request
 * 
 * @param {String} url - API endpoint path
 * @param {Object} authData - Auth data from performanceApiLogIn
 * @param {Object} options - Additional options
 * @param {Object} options.params - Query parameters
 * @param {Object} options.extraHeaders - Additional headers
 * @returns {Promise<{response: APIResponse, body: any}>}
 */
export async function apiGet(url, authData, options = {}) {
  const extraHeaders = options.extraHeaders || {};
  const params = options.params || {};
  
  const fullUrl = buildFullUrl(url, authData.baseUrl);
  const headers = {
    ...getStandardHeaders(authData),
    ...extraHeaders
  };

  const apiContext = await createAPIContext();
  
  try {
    console.log(`→ GET ${fullUrl}`);
    const response = await apiContext.get(fullUrl, {
      headers,
      params,
      timeout: options.timeout || 30000
    });
    console.log(`← ${response.status()} ${response.statusText()}`);

    // CRITICAL: Read body BEFORE disposing context
    const body = await parseResponseBody(response);
    
    return { response, body };
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Make API PUT request
 * 
 * @param {String} url - API endpoint path
 * @param {Object} authData - Auth data from performanceApiLogIn
 * @param {Object} payload - Request payload
 * @param {Object} options - Additional options
 * @returns {Promise<APIResponse>}
 */
export async function apiPut(url, authData, payload, options = {}) {
  const contentType = options.contentType || 'json';
  const extraHeaders = options.extraHeaders || {};
  
  const fullUrl = buildFullUrl(url, authData.baseUrl);
  const headers = {
    ...getStandardHeaders(authData, contentType),
    ...extraHeaders
  };

  const apiContext = await createAPIContext();
  
  try {
    const requestOptions = {
      headers,
      timeout: options.timeout || 30000
    };

    if (contentType === 'form') {
      requestOptions.form = payload;
    } else {
      requestOptions.data = payload;
    }

    console.log(`→ PUT ${fullUrl}`);
    const response = await apiContext.put(fullUrl, requestOptions);
    console.log(`← ${response.status()} ${response.statusText()}`);

    // CRITICAL: Read body BEFORE disposing context
    const body = await parseResponseBody(response);
    
    return { response, body };
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Make API DELETE request
 * 
 * @param {String} url - API endpoint path
 * @param {Object} authData - Auth data from performanceApiLogIn
 * @param {Object} options - Additional options
 * @param {String} options.data - Request body data (for special DELETE endpoints)
 * @returns {Promise<APIResponse>}
 */
export async function apiDelete(url, authData, options = {}) {
  const extraHeaders = options.extraHeaders || {};
  
  const fullUrl = buildFullUrl(url, authData.baseUrl);
  const headers = {
    ...getStandardHeaders(authData),
    ...extraHeaders
  };

  const apiContext = await createAPIContext();
  
  try {
    const requestOptions = {
      headers,
      timeout: options.timeout || 30000
    };
    
    // Some DELETE endpoints require a body (e.g., DeleteMatter)
    if (options.data !== undefined) {
      requestOptions.data = options.data;
    }
    
    console.log(`→ DELETE ${fullUrl}`);
    const response = await apiContext.delete(fullUrl, requestOptions);
    console.log(`← ${response.status()} ${response.statusText()}`);

    // CRITICAL: Read body BEFORE disposing context
    const body = await parseResponseBody(response);
    
    return { response, body };
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Parse API response body
 * Handles both JSON and text responses
 * 
 * @param {APIResponse} response - Playwright API response
 * @returns {Promise<any>} Parsed response body
 */
export async function parseResponseBody(response) {
  // CRITICAL: Read the response body ONLY ONCE
  // Playwright APIResponse can only be consumed once
  const bodyText = await response.text();
  const contentType = response.headers()['content-type'] || '';
  
  // Try to parse as JSON if content-type indicates JSON
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(bodyText);
    } catch (error) {
      console.warn('Failed to parse JSON response:', error.message);
      return bodyText;
    }
  }
  
  // For non-JSON content types, try JSON anyway as fallback
  try {
    return JSON.parse(bodyText);
  } catch (error) {
    // If not JSON, return as text
    return bodyText;
  }
}

/**
 * Check if API response is successful
 * 
 * @param {APIResponse} response - Playwright API response
 * @returns {Boolean}
 */
export function isResponseSuccess(response) {
  const status = response.status();
  return status >= 200 && status < 300;
}

/**
 * Log API response details (for debugging)
 * 
 * @param {APIResponse} response - Playwright API response
 * @param {Boolean} includeBody - Whether to log response body
 */
export async function logResponseDetails(response, includeBody = false) {
  console.log('\n=== API Response Details ===');
  console.log(`Status: ${response.status()} ${response.statusText()}`);
  console.log(`URL: ${response.url()}`);
  
  if (includeBody) {
    const body = await parseResponseBody(response);
    console.log('Body:', typeof body === 'string' ? body.substring(0, 500) : body);
  }
  
  console.log('===========================\n');
}
