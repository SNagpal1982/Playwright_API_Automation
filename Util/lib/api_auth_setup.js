/**
 * API Authentication Setup Module
 * Handles UI-based authentication to extract JWT tokens and session cookies
 * for subsequent API testing without browser overhead
 */

import { launch } from '../qawHelpers.js';
import { expect } from '@playwright/test';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Auth cache configuration
const AUTH_CACHE_DIR = process.env.AUTH_CACHE_DIR || join(process.cwd(), '.auth-cache');
const AUTH_CACHE_FILE = join(AUTH_CACHE_DIR, 'api-auth-cache.json');

// In-memory cache for fast access
const authCache = new Map();

/**
 * Build URL helper (matches performance helpers pattern)
 */
function buildUrl(route = "/") {
  const baseUrl = (
    process.env.DEFAULT_URL || "https://qa.zolastaging.com/Login.aspx"
  ).replace(/\/$/, "");
  return `${baseUrl}${route}`;
}

/**
 * Modified performanceApiLogIn - UI login to extract auth data
 * Based on performanceSmartLogIn but focused on auth extraction
 * 
 * @param {Object} options - Login options
 * @param {String} options.email - User email
 * @param {String} options.password - User password
 * @returns {Object} Auth data containing webTok, cookies, etc.
 */
export async function performanceApiLogIn(options = {}) {
  const email = options.email || process.env.DEFAULT_USER;
  const password = options.password || process.env.DEFAULT_LEGAL_PASSWORD;
  
  console.log(`\n=== API AUTH SETUP ===`);
  console.log(`Authenticating user: ${email}`);
  console.log(`Target: ${buildUrl()}`);
  console.log(`=====================\n`);

  // Always use headless for auth setup (pipeline compatibility)
  const launchOptions = {
    headless: true,
    slowMo: 250,
    ...options,
    headless: true // Force headless
  };

  let browser, context, page;
  
  try {
    // Launch browser
    ({ browser, context } = await launch(launchOptions));
    page = await context.newPage();
    
    // Navigate to login page
    await page.goto(buildUrl());
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Login
  await page.locator(`#txtUserName`).click();
  await page.keyboard.type(email);

  await page.locator(`#txtPwd`).click();
  await page.keyboard.type(password);

  await page.locator(`#loginBtn`).click();

  // Wait for load
  await page.waitForLoadState("load");

  // Close popup if it appears
  try {
    const locator = page.getByText("How likely are you to");
    await locator.waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "close" }).click();
  } catch (error) {
    console.log("Popup did not appear, no action needed.");
  }

  // // if modal appears - close
  // if (await performanceIsVisible(page, `#pendo-guide-container`, 5000)) {
  //   await page.locator(`[aria-label="Close"]`).click();
  // }

  // Check for login errors
  if(await page.getByText(`Invalid Username or Password`).isVisible()) {
    const errorMsg = `Invalid Username or Password for ${email}`;
    console.error(errorMsg);
    throw Error(errorMsg);
  }

  // Verify login success with soft assertions and timeouts
  try {
    // Wait for either success indicator to appear
    await page.waitForSelector(`#pageheader-brand-reg[alt="CARET Legal"], [href="#"] #imgUserPic`, { timeout: 10000 });
    console.log(`Login successful for ${email}`);
  } catch (error) {
    console.warn(`Login verification timeout - continuing anyway. Error: ${error.message}`);
  }
  
  await page.waitForLoadState("domcontentloaded", { timeout: 240000 });
  
  console.log(`Login completed for ${email}`);

    // Extract cookies and auth data
    console.log('Extracting authentication data...');
    const allCookies = await context.cookies();
    
    // Find the web-tok JWT token
    const webTokCookie = allCookies.find(c => c.name === 'web-tok');
    const webTok = webTokCookie?.value;
    
    if (!webTok) {
      console.warn('WARNING: web-tok cookie not found! Auth may not work.');
    } else {
      console.log(`✓ JWT token extracted (length: ${webTok.length})`);
    }

    // Create cookie header string
    const cookieHeader = allCookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

    console.log(`✓ Extracted ${allCookies.length} cookies`);
    
    // Build auth data object
    const authData = {
      email,
      password,
      webTok,
      cookieHeader,
      allCookies,
      authenticatedAt: Date.now(),
      expiresIn: 3600000, // 1 hour default
      baseUrl: buildUrl('/').replace('/Login.aspx', '')
    };

    console.log(`✓ Authentication successful for ${email}\n`);

    return authData;

  } catch (error) {
    console.error(`\n❌ Authentication failed for ${email}:`);
    console.error(error.message);
    throw error;
  } finally {
    // Clean up browser resources
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed');
      } catch (e) {
        console.warn('Failed to close browser:', e.message);
      }
    }
  }
}

/**
 * Setup authentication for a single user with caching
 * Checks cache first, only authenticates if needed
 * 
 * @param {Object} user - User credentials
 * @returns {Object} Auth data
 */
export async function setupSingleUserAuth(user) {
  const { email, password } = user;
  
  // Check in-memory cache first
  if (authCache.has(email)) {
    const cached = authCache.get(email);
    const age = Date.now() - cached.authenticatedAt;
    
    // Return cached if not expired (< 45 minutes)
    if (age < 2700000) {
      console.log(`✓ Using cached auth for ${email} (age: ${Math.round(age / 60000)} min)`);
      return cached;
    } else {
      console.log(`⚠ Cached auth expired for ${email}, re-authenticating...`);
    }
  }

  // Authenticate and cache
  const authData = await performanceApiLogIn({ email, password });
  authCache.set(email, authData);
  
  return authData;
}

/**
 * Load auth cache from file (for pipeline persistence)
 */
export async function loadAuthCache() {
  try {
    if (!existsSync(AUTH_CACHE_FILE)) {
      console.log('No auth cache file found, starting fresh');
      return;
    }

    const data = JSON.parse(await readFile(AUTH_CACHE_FILE, 'utf-8'));
    const now = Date.now();
    let loaded = 0;
    let expired = 0;

    for (const [email, authData] of Object.entries(data)) {
      const age = now - authData.authenticatedAt;
      
      if (age < 2700000) { // < 45 minutes
        authCache.set(email, authData);
        loaded++;
      } else {
        expired++;
      }
    }

    console.log(`\n📂 Loaded auth cache: ${loaded} valid, ${expired} expired\n`);
  } catch (error) {
    console.warn('Failed to load auth cache:', error.message);
  }
}

/**
 * Save auth cache to file (for pipeline persistence)
 */
export async function saveAuthCache() {
  try {
    // Ensure directory exists
    if (!existsSync(AUTH_CACHE_DIR)) {
      await mkdir(AUTH_CACHE_DIR, { recursive: true });
    }

    // Convert Map to object
    const data = Object.fromEntries(authCache.entries());
    
    await writeFile(AUTH_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`\n💾 Saved auth cache: ${authCache.size} users\n`);
  } catch (error) {
    console.warn('Failed to save auth cache:', error.message);
  }
}

/**
 * Get auth data for a user (with lazy loading)
 * 
 * @param {String} email - User email
 * @returns {Object} Auth data or null if not found
 */
export function getAuthForUser(email) {
  if (!authCache.has(email)) {
    console.warn(`⚠ No auth data found for ${email}`);
    return null;
  }

  const authData = authCache.get(email);
  const age = Date.now() - authData.authenticatedAt;
  
  // Warn if getting old (> 45 min)
  if (age > 2700000) {
    console.warn(`⚠ Auth data for ${email} is ${Math.round(age / 60000)} minutes old, may be expired`);
  }

  return authData;
}

/**
 * Setup authentication for multiple users (parallel execution)
 * 
 * @param {Array} userList - Array of {email, password} objects
 * @param {Number} concurrency - Max concurrent authentications (default: 3)
 * @returns {Map} Auth data for all users
 */
export async function setupMultiUserAuth(userList, concurrency = 3) {
  console.log(`\n🔐 Setting up authentication for ${userList.length} users (concurrency: ${concurrency})`);
  console.log(`====================================\n`);

  // Load existing cache first
  await loadAuthCache();

  const results = new Map();
  const errors = [];

  // Process users in batches to control concurrency
  for (let i = 0; i < userList.length; i += concurrency) {
    const batch = userList.slice(i, i + concurrency);
    
    console.log(`\nProcessing batch ${Math.floor(i / concurrency) + 1}...`);
    
    const batchPromises = batch.map(async (user) => {
      try {
        const authData = await setupSingleUserAuth(user);
        results.set(user.email, authData);
        return { success: true, email: user.email };
      } catch (error) {
        errors.push({ email: user.email, error: error.message });
        return { success: false, email: user.email, error: error.message };
      }
    });

    await Promise.all(batchPromises);
  }

  // Save cache for future use
  await saveAuthCache();

  console.log(`\n====================================`);
  console.log(`✓ Successfully authenticated: ${results.size} users`);
  if (errors.length > 0) {
    console.log(`❌ Failed: ${errors.length} users`);
    errors.forEach(e => console.log(`   - ${e.email}: ${e.error}`));
  }
  console.log(`====================================\n`);

  return results;
}

/**
 * Clear auth cache (for testing/debugging)
 */
export function clearAuthCache() {
  authCache.clear();
  console.log('Auth cache cleared');
}

/**
 * Get cache statistics
 */
export function getAuthCacheStats() {
  const now = Date.now();
  const stats = {
    totalUsers: authCache.size,
    valid: 0,
    expiringSoon: 0,
    expired: 0,
    users: []
  };

  for (const [email, authData] of authCache.entries()) {
    const age = now - authData.authenticatedAt;
    const ageMinutes = Math.round(age / 60000);
    
    let status = 'valid';
    if (age > 2700000) {
      status = 'expired';
      stats.expired++;
    } else if (age > 2400000) {
      status = 'expiring-soon';
      stats.expiringSoon++;
    } else {
      stats.valid++;
    }

    stats.users.push({
      email,
      ageMinutes,
      status
    });
  }

  return stats;
}
