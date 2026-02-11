import { time } from 'console';
import { assert, expect, test, getInbox, launch, dotenv, saveTrace, faker, dateFns, twilio, StreamZip, axios, xlsx, jsQR, pngjs } from '../qawHelpers.js';
import * as npmImports from '../qawHelpers.js';
import path from 'path';
import { ca } from 'date-fns/locale';
//const { readFile, writeFile, mkdir } = await import("node:fs/promises");

/**
 * Simple URL verification function for Playwright tests
 * @param {Page} page - Playwright page object
 * @param {RegExp} urlPattern - URL pattern to match
 * @param {string} description - Description for logging
 */
export async function verifyURLSafe(page, urlPattern, description = "page") {
  await expect(page).toHaveURL(urlPattern, { timeout: 20_000 });
  console.log(`URL verification passed for ${description}`);
}

/**
 * Enhanced setFiles function with comprehensive logging for pipeline debugging
 * Designed to help identify where files should be placed in 3rd party maintained pipelines
 * @param {FileChooser} chooser - Playwright file chooser object
 * @param {string} filePath - Path to the file to be set
 * @param {string} context - Context description (e.g., "Credit Card Expense", "Vendor Bill")
 */
export async function setFilesWithLogging(chooser, filePath, context = "Unknown") {
  console.log(`\n🔍 [PIPELINE-DEBUG] ${context} - File upload attempt started`);
  console.log(`📄 [PIPELINE-DEBUG] Target file path: ${filePath}`);
  
  // Enhanced environment and system info logging
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  
  console.log(`\n📊 [PIPELINE-DEBUG] System Information:`);
  console.log(`   - Operating System: ${os.platform()} ${os.arch()}`);
  console.log(`   - Node.js Version: ${process.version}`);
  console.log(`   - Current Working Directory: ${process.cwd()}`);
  console.log(`   - User Home Directory: ${os.homedir()}`);
  console.log(`   - Temp Directory: ${os.tmpdir()}`);
  
  console.log(`\n🌍 [PIPELINE-DEBUG] Environment Variables (Pipeline Context):`);
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`   - DEFAULT_URL: ${process.env.DEFAULT_URL || 'undefined'}`);
  console.log(`   - CI: ${process.env.CI || 'undefined'}`);
  console.log(`   - BUILD_SOURCESDIRECTORY: ${process.env.BUILD_SOURCESDIRECTORY || 'undefined'}`);
  console.log(`   - AGENT_BUILDDIRECTORY: ${process.env.AGENT_BUILDDIRECTORY || 'undefined'}`);
  console.log(`   - SYSTEM_DEFAULTWORKINGDIRECTORY: ${process.env.SYSTEM_DEFAULTWORKINGDIRECTORY || 'undefined'}`);
  
  // Analyze the file path structure
  console.log(`\n🗂️ [PIPELINE-DEBUG] File Path Analysis:`);
  const absolutePath = path.resolve(filePath);
  const relativePath = path.relative(process.cwd(), absolutePath);
  const directory = path.dirname(absolutePath);
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(filePath);
  
  console.log(`   - Original path: ${filePath}`);
  console.log(`   - Absolute path: ${absolutePath}`);
  console.log(`   - Relative path: ${relativePath}`);
  console.log(`   - Directory: ${directory}`);
  console.log(`   - File name: ${fileName}`);
  console.log(`   - File extension: ${fileExtension}`);
  
  // Check only relevant file locations for current setup
  const potentialPaths = [
    filePath, // Original path (should be src/artillery/scenarios/filename)
    absolutePath, // Absolute version
    path.join(process.cwd(), fileName), // Just filename in CWD root
    path.join(process.cwd(), 'src', 'artillery', 'scenarios', fileName), // Expected location
  ];
  
  console.log(`\n🔍 [PIPELINE-DEBUG] Checking relevant file locations:`);
  const foundPaths = [];
  for (const potentialPath of potentialPaths) {
    try {
      const exists = fs.existsSync(potentialPath);
      const status = exists ? '✅ EXISTS' : '❌ NOT FOUND';
      console.log(`   ${status} - ${potentialPath}`);
      if (exists) {
        foundPaths.push(potentialPath);
        // Get file stats for existing files
        const stats = fs.statSync(potentialPath);
        console.log(`     └── Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
      }
    } catch (checkError) {
      console.log(`   ⚠️ ERROR checking - ${potentialPath}: ${checkError.message}`);
    }
  }
  
  // List contents of current directory and scenarios directory
  console.log(`\n📋 [PIPELINE-DEBUG] Directory Exploration:`);
  const dirsToCheck = [
    process.cwd(),
    path.join(process.cwd(), 'src', 'artillery', 'scenarios'),
  ];
  
  for (const dir of dirsToCheck) {
    try {
      if (fs.existsSync(dir)) {
        const contents = fs.readdirSync(dir);
        console.log(`   📁 ${dir}:`);
        console.log(`     └── Contents: [${contents.join(', ')}]`);
      } else {
        console.log(`   📁 ${dir}: DIRECTORY NOT FOUND`);
      }
    } catch (dirError) {
      console.log(`   📁 ${dir}: ERROR - ${dirError.message}`);
    }
  }
  
  console.log(`\n🎯 [PIPELINE-DEBUG] Attempting file upload with original path...`);
  
  try {
    await chooser.setFiles(filePath);
    console.log(`✅ [PIPELINE-DEBUG] SUCCESS: File uploaded successfully using: ${filePath}`);
    console.log(`📋 [PIPELINE-DEBUG] SOLUTION: Place '${fileName}' at: ${path.resolve(filePath)}`);
  } catch (error) {
    console.error(`❌ [PIPELINE-DEBUG] FAILED: File upload failed for: ${filePath}`);
    console.error(`❌ [PIPELINE-DEBUG] Error: ${error.message}`);
    
    // Provide actionable recommendations
    console.log(`\n💡 [PIPELINE-DEBUG] RECOMMENDATIONS FOR PIPELINE SETUP:`);
    console.log(`   1. Create file '${fileName}' in one of these locations:`);
    
    if (foundPaths.length > 0) {
      console.log(`   2. Alternative paths where file already exists:`);
      foundPaths.forEach(foundPath => {
        console.log(`      - ${foundPath}`);
      });
    } else {
      console.log(`   2. No existing instances of '${fileName}' found in common locations`);
      console.log(`   3. Suggested locations to try (in order of preference):`);
      console.log(`      - ${path.join(process.cwd(), fileName)} (CWD root)`);
      console.log(`      - ${path.join(process.cwd(), 'files', fileName)} (files subdirectory)`);
      console.log(`      - ${absolutePath} (exact path as specified)`);
    }
    
    console.log(`\n📋 [PIPELINE-DEBUG] PIPELINE SETUP COMMANDS:`);
    console.log(`   mkdir -p "${directory}"`);
    console.log(`   # Copy your test file to: ${absolutePath}`);
    
    throw error;
  }
}

/**
 * @typedef {import("playwright").Page} Page
 */

export function performanceBuildUrl(route = "/") {
  const baseUrl = (
    process.env.DEFAULT_URL || "https://qa.zolastaging.com/Login.aspx" 
  ).replace(/\/$/, "");

  return `${baseUrl}${route}`;
}
// Deletes all the emails with the prefix search,
// Still need to search for email before calling function
export async function performanceDeleteMatchingEmails(page, prefix) {
  let hasMore = true;

  while (hasMore) {
    const emailItems = page.locator(`.email-item:has-text("${prefix}")`);
    const count = await emailItems.count();

    if (count === 0) {
      hasMore = false;
      break;
    }

    const emailItem = emailItems.first();
    await emailItem.click();

    const deleteButton = page.locator("#deleteEmailButton").getByText("Delete");
    await deleteButton.click();

    await page.getByText("Email moved to trash").waitFor();

    await page.waitForTimeout(2000);
  }
}
/**
 * Logs into the main site
 * @param {Object} options - Launch options for the browser
 * @param {String} options.email - The email that you want to log in with
 */

export async function performanceLogIn(options = {}) {
  // Navigate to DEFAULT_URL
  
  // Force headless mode for container environments (AWS Fargate, Docker, etc.)
  const launchOptions = { 
    slowMo: 750, 
    ...options, 
    headless: true  // Always headless for containers
  };

  const { browser, context } = await launch(launchOptions);
  const page = await context.newPage();
  await page.goto(performanceBuildUrl());

  // Login
  await page.locator(`#txtUserName`).click();
  await page.keyboard.type(options.email || process.env.DEFAULT_USER);

  await page.locator(`#txtPwd`).click();
  await page.keyboard.type(
    options.password || process.env.DEFAULT_LEGAL_PASSWORD,
  );

  await page.locator(`#loginBtn`).click();

  // wait for load
  await page.waitForLoadState("load");

  // close out random pop up that appears
  try {
    const locator = page.getByText("How likely are you to");
    await locator.waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "close" }).click();
  } catch (error) {
    console.log("Popup did not appear, no action needed.");
  }

  // if modal appears - close
  if (await performanceIsVisible(page, `#pendo-guide-container`, 5000)) {
    await page.locator(`[aria-label="Close"]`).click();
  }
  if(await page.getByText(`Invalid Username or Password`).isVisible()) {
    throw Error("Invalid Username or Password");
  }
  // assert log in was successful
  // NOTE: For Artillery compatibility, use performanceSmartLogIn instead
  // -- Header (top left nav "Caret Legal") to be visible
  await expect(
    page.locator(`#pageheader-brand-reg[alt="CARET Legal"]`),
  ).toBeVisible();

  // -- Avatar (top right nav) should be visible
  await expect(page.locator(`[href="#"] #imgUserPic`)).toBeVisible();

  await page.waitForLoadState("domcontentloaded");

  return { browser, context, page };
}

/**
 * Smart login function with random user support and pipeline compatibility
 * @param {Object} options - Launch options and credentials
 * @param {String} options.email - The email for login (cannot be used with useRandomUser)
 * @param {String} options.password - The password for login (cannot be used with useRandomUser)
 * @param {Boolean} options.useRandomUser - If true, randomly selects from hardcoded user pool (default: false)
 * @param {Object} userContext - Ignored, kept for compatibility
 */
export async function performanceSmartLogIn(options = {}, userContext = null) {
  let email, password;
  
  // Hardcoded test user pool for load testing
  const testUsers = [
    {
      email: 'Client.TextingQA@Zolapedia.com',
      password: 'Success123',
      userType: 'admin',
      firm: 'qa_firm'
    },
    {
      email: 'performance.tester.1@mailinator.com', 
      password: 'Success123',
      userType: 'admin',
      firm: 'qa_firm'
    },
      {
      email: 'performance.tester.2@mailinator.com',
      password: 'Success123', 
      userType: 'admin',
      firm: 'qa_firm'
    }
  ];
  
  // Validation: useRandomUser cannot be combined with email or password
  if (options.useRandomUser && (options.email || options.password)) {
    throw new Error(
      '❌ Invalid options: useRandomUser cannot be combined with email or password. ' +
      'Either use { useRandomUser: true } OR provide specific credentials, not both.'
    );
  }
  
  // NEW LOGIC with useRandomUser flag priority
  if (options.useRandomUser) {
    // CASE 1: Random user flag is set → Use random user from pool
    const randomIndex = Math.floor(Math.random() * testUsers.length);
    const selectedUser = testUsers[randomIndex];
    email = selectedUser.email;
    password = selectedUser.password;
    console.log("=== USING RANDOM USER FROM POOL ===");
    console.log(`Randomly selected user ${randomIndex + 1} of ${testUsers.length}:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  User Type: ${selectedUser.userType}`);
    console.log(`  Firm: ${selectedUser.firm}`);
    console.log("===================================");
    
  } else if (options.email && options.password) {
    // CASE 2: Both email and password provided → Use provided credentials
    email = options.email;
    password = options.password;
    console.log("=== USING PROVIDED CREDENTIALS ===");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("=================================");
    
  } else if (options.email && !options.password) {
    // CASE 3: Email provided but no password → Use email + env password
    email = options.email;
    password = process.env.DEFAULT_LEGAL_PASSWORD;
    console.log("=== USING EMAIL + ENV PASSWORD ===");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password} (from DEFAULT_LEGAL_PASSWORD)`);
    console.log("==================================");
    
  } else {
    // CASE 4: No email/password provided → Use environment variables (DEFAULT)
    email = process.env.DEFAULT_USER;
    password = process.env.DEFAULT_LEGAL_PASSWORD;
    console.log("=== USING ENVIRONMENT CREDENTIALS ===");
    console.log(`Email: ${email} (from DEFAULT_USER)`);
    console.log(`Password: ${password} (from DEFAULT_LEGAL_PASSWORD)`);
    console.log("=====================================");
  }
  
  // Get the URL that will be used
  const loginUrl = performanceBuildUrl();
  
  console.log(`=== FINAL LOGIN DETAILS ===`);
  console.log(`URL: ${loginUrl}`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`===========================`);

  // Force headless mode for container environments (AWS Fargate, Docker, etc.)
  // This prevents "Executable doesn't exist" errors in containerized CI/CD pipelines
  const browserOptions = {
    headless: true,  // Always headless for containers - never override this
    slowMo: 250,
    ...options,
    headless: true   // Force headless again after spread to ensure it's never overridden
  };

  console.log(`Browser configured: headless=${browserOptions.headless} (forced for containers)`);

  // Launch browser and navigate
  const { browser, context } = await launch(browserOptions);
  const page = await context.newPage();
  await page.goto(performanceBuildUrl());

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

  return { browser, context, page };
}

/**
 * Wrapper function that ensures proper browser cleanup after test execution
 * Prevents memory leaks during Artillery load tests by closing browser resources
 * 
 * @param {Function} testFunction - The async test function to execute, receives { browser, context, page }
 * @param {Object} loginOptions - Options passed to performanceSmartLogIn
 * @returns {Promise<void>}
 * 
 * @example
 * await performanceWithBrowserCleanup(async ({ page }) => {
 *   await page.goto('https://example.com');
 *   // ... test logic ...
 * }, { email: 'test@example.com', password: 'pass123' });
 */
export async function performanceWithBrowserCleanup(testFunction, loginOptions = {}) {
  let browser, context, page;
  
  try {
    // Login and get browser resources
    const resources = await performanceSmartLogIn(loginOptions);
    browser = resources.browser;
    context = resources.context;
    page = resources.page;
    
    console.log('[CLEANUP] Browser resources created');
    
    // Execute the test function
    await testFunction({ browser, context, page });
    
    console.log('[CLEANUP] Test completed successfully');
  } catch (error) {
    console.error('[CLEANUP] Test failed with error:', error.message);
    throw error; // Re-throw to preserve Artillery error tracking
  } finally {
    // Always cleanup resources, even if test fails
    try {
      if (page && typeof page.close === 'function') {
        await page.close();
        console.log('[CLEANUP] Page closed');
      }
      
      if (context && typeof context.close === 'function') {
        await context.close();
        console.log('[CLEANUP] Context closed');
      }
      
      if (browser && typeof browser.close === 'function') {
        await browser.close();
        console.log('[CLEANUP] Browser closed');
      }
    } catch (cleanupError) {
      console.error('[CLEANUP] Error during cleanup:', cleanupError.message);
      // Don't throw cleanup errors - test result is more important
    }
  }
}

// helper function to handle email codes from outlook
// takes in the email as a string
export async function performanceHandleEmailVerification(page, email) {
  const isVerificationVisible = await page
    .locator(`[data-testid="title"]:has-text('Verify your email')`)
    .isVisible();

  const isPasswordPromptVisible = await page
    .locator(`[data-testid="title"]:has-text('Enter your password')`)
    .isVisible();

  const isSecondVerificationVisible = await page
    .locator(
      `[data-testid="subtitle"]:has-text('Just one more step to verify it’s you.')`,
    )
    .isVisible();

  // If none of the prompts are visible, break
  if (
    !isVerificationVisible &&
    !isSecondVerificationVisible &&
    !isPasswordPromptVisible
  ) {
    return;
  }

  // Handle password prompt first if shown
  if (isPasswordPromptVisible) {
    await page
      .getByRole(`button`, { name: `Send a code to ca*****@qawolf` })
      .click();
    // wait for second verification step to load
    await page
      .locator(`[data-testid="title"]:has-text('Verify your email')`)
      .waitFor({ timeout: 10000 });
  }

  // At this point, one of the verification prompts is visible
  const date = new Date();

  // Fill in the email and request the code
  await page
    .getByRole("textbox", { name: "Email" })
    .pressSequentially(email, { delay: 200 });
  //wait
  await page.waitForTimeout(2_000);
  // click send
  await page.keyboard.press("Enter");

  if (
    await page
      .getByText(`We couldn't send the code. Please try again.`)
      .isVisible()
  ) {
    // go back
    await page.locator(`[data-testid="leftArrowIcon"]`).click();
    await page.waitForTimeout(2_000);
    // pasword
    await page.getByRole("textbox", { name: "Password" }).fill("QAWolf123!");
    await page.waitForTimeout(2_000);
    // click send
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2_000);

    await page
      .getByRole(`button`, { name: `Send a code to ca*****@qawolf` })
      .click();
    // Fill in the email and request the code
    await page
      .getByRole("textbox", { name: "Email" })
      .pressSequentially(email, { delay: 200 });
    //wait
    await page.waitForTimeout(2_000);
    // click send
    await page.keyboard.press("Enter");
  }
  // Wait for the code in the inbox
  const { code } = await performanceCheckEmailForCode(page, email, date);

  // Fill the code one digit at a time
  const digits = code.split("");
  await page.locator("#codeEntry-0").fill(digits[0]);
  await page.locator("#codeEntry-1").fill(digits[1]);
  await page.locator("#codeEntry-2").fill(digits[2]);
  await page.locator("#codeEntry-3").fill(digits[3]);
  await page.locator("#codeEntry-4").fill(digits[4]);
  await page.locator("#codeEntry-5").fill(digits[5]);
}
export async function performanceCheckEmailForCode(page, email, dateObj) {
  const { waitForMessage } = await getInbox({ address: email });
  const { text } = await waitForMessage({ after: dateObj });

  const knownPhrases = ["Your single-use code is:", "Security code:"];

  let code = null;

  for (const phrase of knownPhrases) {
    if (text.includes(phrase)) {
      code = text.split(phrase)[1]?.trim().split(" ")[0];
      break;
    }
  }

  if (!code) {
    throw new Error("Code not found after the phrase.");
  }

  return { code };
}

/**
 * Helper function to handle additional modal to confirm the user
 */
export async function performanceLogInAtTheConfirmModal(page, options = {}) {
  try {
    const modalDialogiFrame = page.frameLocator("#userSettingsModal-iframe");
    await modalDialogiFrame
      .locator("input#verify-login-username-input")
      .fill(options.userName);
    await modalDialogiFrame
      .locator("input#verify-login-password-input")
      .fill(options.password);
    await modalDialogiFrame
      .locator('a[onclick*="continueUpdateUserSettings()"]')
      .click({ delay: 1000 });
  } catch (e) {
    console.error(e);
  }
}
const loginNoBot = async (options = {}, assertTeam = true) => {
  let context;
  let browser;
  let page;

  if (!options.page) {
    const launchItems = await launch({
      ...options,
      headless: true,  // Force headless for containers
      args: [
        "--disable-web-security",
        "--ignore-certificate-errors",
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
      ],
    });

    browser = launchItems.browser;

    // Create context with a custom user agent
    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });

    page = await context.newPage();

    // Apply stealth features
    await page.addInitScript(() => {
      // Hide navigator.webdriver
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });

      // Mock plugins and MIME types
      Object.defineProperty(navigator, "plugins", {
        get: () => [{ name: "Chrome PDF Viewer" }],
      });

      Object.defineProperty(navigator, "mimeTypes", {
        get: () => [{ type: "application/pdf" }],
      });

      // Mock languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });

      // Mock hardwareConcurrency
      Object.defineProperty(navigator, "hardwareConcurrency", {
        get: () => 4,
      });

      // Mock platform
      Object.defineProperty(navigator, "platform", {
        get: () => "Win32",
      });
    });
  } else {
    page = options.page;
  }

  // Go to main URL from env
  if (!options.url || options.url === process.env.DEFAULT_URL) {
    await page.goto(buildUrl("/"));
  }
  // Add a random delay of 1 to 5 seconds to simulate human behavior
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Scroll the page to load additional content
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));

  // Add another random delay of 1 to 5 seconds
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Login process
  await page.locator(`#txtUserName`).click();
  await page.keyboard.type(options.email || process.env.DEFAULT_USER);
  // Add a random delay of 1 to 5 seconds to simulate human behavior
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Scroll the page to load additional content
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));

  // Add another random delay of 1 to 5 seconds
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  await page.locator(`#txtPwd`).click();
  await page.keyboard.type(
    options.password || process.env.DEFAULT_LEGAL_PASSWORD,
  );

  await page.locator(`#loginBtn`).click();
  // Add a random delay of 1 to 5 seconds to simulate human behavior
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Scroll the page to load additional content
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));

  // Add another random delay of 1 to 5 seconds
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Wait for page load
  await page.waitForLoadState("load");
  // Add a random delay of 1 to 5 seconds to simulate human behavior
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Scroll the page to load additional content
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));

  // Add another random delay of 1 to 5 seconds
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Handle popup if it appears
  try {
    const locator = page.getByText("How likely are you to");
    await locator.waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "close" }).click();
  } catch (error) {
    console.log("Popup did not appear, no action needed.");
  }
  // Add a random delay of 1 to 5 seconds to simulate human behavior
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Scroll the page to load additional content
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));

  // Add another random delay of 1 to 5 seconds
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Close modal if it appears
  if (await performanceIsVisible(page, `#pendo-guide-container`, 5000)) {
    await page.locator(`[aria-label="Close"]`).click();
  }

  // Add a random delay of 1 to 5 seconds to simulate human behavior
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Scroll the page to load additional content
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));

  // Add another random delay of 1 to 5 seconds
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Assert successful login
  await expect(
    page.locator(`#pageheader-brand-reg[alt="CARET Legal"]`),
  ).toBeVisible();

  await expect(page.locator(`[href="#"] #imgUserPic`)).toBeVisible();

  await page.waitForLoadState("domcontentloaded");
  // Add a random delay of 1 to 5 seconds to simulate human behavior
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  // Scroll the page to load additional content
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));

  // Add another random delay of 1 to 5 seconds
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * 4000 + 1000)),
  );

  return { browser, context, page };
};

export async function performanceLogInToClientPortal(options = {}) {
  // check client portal has shared document
  const { context } = await launch({ slowMo: 500, ...options });
  const page = await context.newPage();
  const clientPortalUrl = process.env.CLIENT_PORTAL_URL;
  const clientPortalUsername = options.userName || process.env.CLIENT_USERNAME;
  const clientPortalPassword = options.password || process.env.DEFAULT_PASSWORD;
  
  console.log("======== CLIENT PORTAL LOGIN =========");
  console.log(`  URL: ${clientPortalUrl}`);
  console.log(`  Username: ${clientPortalUsername}`);
  console.log(`  Password: ${clientPortalPassword}`);
  console.log("===================================");
  await page.goto(clientPortalUrl);
  // fill in userName
  await page
    .getByRole(`textbox`, { name: `Username` })
    .fill(clientPortalUsername);

  // fill in password
  await page
    .getByRole(`textbox`, { name: `Password` })
    .fill(clientPortalPassword);

  // login
  await page.locator(`[value="Login"]`).click();

  await page.waitForLoadState("load");

  await expect(
    page.locator(
      `#header-functions #lblUserName:has-text("${
        options.userName || process.env.CLIENT_USERNAME
      }")`,
    ),
  ).toBeVisible({ timeout: 120_000 });

  return page;
}

export async function performanceCreateUserAndLogIn(page, user) {
  console.log(user.email);
  const { waitForMessage } = await getInbox({
    address: user.email,
  });

  // Click + from User & Groups top nav
  await page.locator(`#add-new-user`).click();

  // Setup iframe
  const frame = page.frameLocator(
    `iframe[src="/Settings/TabPages/Newuser.aspx?isPopup=1&"]`,
  );

  // Fill out all inputs with user object
  await frame
    .locator(`input:below(span:has-text("First Name"))`)
    .first()
    .fill(user.fName);
  await frame
    .locator(`input:below(span:has-text("Last Name"))`)
    .first()
    .fill(user.lName);
  await frame
    .locator(`input:below(span:has-text("Email"))`)
    .first()
    .fill(user.email);
  await frame.locator(`a:below(span:has-text("Role"))`).first().click();
  await frame.locator(`ul.rcbList >> li:text-is("${user.role}")`).click();
  await frame.locator(`a:below(span:has-text("Type"))`).first().click();
  await frame.locator(`ul.rcbList >> li:text-is("${user.type}")`).click();

  // Click and drag modal into view
  // Will not click the send button unless the window is dragged
  await page.locator(`div[id="TB_title"]`).hover();
  await page.mouse.down();
  await page.mouse.move(600, -10);
  await page.mouse.up();

  // Click "Send Invite"
  await frame.locator(`input[value="Send Invite"]`).click();

  // successful toast message
  await expect(
    page.locator(`.toast-success:has-text("User Added Successfully")`),
  ).toBeVisible();
  
  // Wait for the toast to disappear
  await expect(
    page.locator(`.toast-success:has-text("User Added Successfully")`),
  ).not.toBeVisible({ timeout: 10000 });

  // invite email should be sent
  const { subject, urls } = await waitForMessage();
  expect(subject).toContain("added you to their firm's Zola account");

  const { context } = await launch();
  const userPage = await context.newPage();
  await userPage.goto(urls[1]);

  // sign up new user
  await userPage
    .locator(`[name="txtPassword"]`)
    .fill(process.env.DEFAULT_LEGAL_PASSWORD);
  await userPage
    .locator(`[name="txtConfirmPassword"]`)
    .fill(process.env.DEFAULT_LEGAL_PASSWORD);
  await userPage.locator(`[value="Activate"]`).click();

  // wait for log in page
  await userPage.waitForSelector(`#logo-caretlegal-vertical`);

  // Log in as new user
  await userPage
    .getByRole(`textbox`, { name: `Username` })
    .fill(`${user.email}`);
  await userPage
    .getByRole(`textbox`, { name: `Password` })
    .fill(`${process.env.DEFAULT_LEGAL_PASSWORD}`);
  await userPage.getByRole(`button`, { name: `Login` }).click();

  // should be directed to Dashboard
  await expect(userPage).toHaveURL(/Dashboard/);

  // release modal should appear
  await expect(
    userPage.locator(`[aria-describedby="ReleaseNoteModal"]`),
  ).toBeVisible();
  await userPage
    .locator(`[aria-describedby="ReleaseNoteModal"] [title="close"]`)
    .click();

  return { userPage };
}
/**
 * Cleans up practice area by name
 * @param {Object} page - page instance
 * @param {String} practiceArea - name of practice area to be deleted
 */
export async function performanceCleanUpPracticeArea(page, practiceArea) {
  // navigate to firm settings
  await page.locator(`#avatar-dropdown-toggle`).click();
  await page.locator(`.dropdown-menu :text("Firm Settings")`).click();

  // navigate to Matters & Contacts > Practice Areas in menu
  await page.locator(`li:has-text("Matters & Contacts")`).click();
  await page.locator(`li:has-text("Practice Areas")`).click();

  // delete practice area
  try {
    await page
      .locator(
        `#practice-area-list tr:has-text("${practiceArea}") .zola-icon-trash`,
      )
      .click({ timeout: 7000 });
    console.log(`Deleting Practice Area "${practiceArea}"`);
  } catch {
    await expect(
      page.locator(`#practice-area-list tr:has-text("${practiceArea}")`),
    ).not.toBeVisible();
    console.log(`Practice Area "${practiceArea}" not found`);
    return;
  }

  // confirm deletion on modal
  await expect(page.locator(`.practice-area-related-modal`)).toContainText(
    `Are you sure you wish to delete this practice area?`,
  );
  await page.locator(`#delete-practice-area-btn`).click();

  // assert success toast
  await expect(page.locator(`#toast-container`)).toHaveText(
    `Practice Area Deleted`,
  );
  await expect(page.locator(`#toast-container`)).not.toBeVisible();
}

/**
 * Cleans up all instance of task template by name
 * @param {Object} page - page instance
 * @param {String} taskTemplateName - any task template with that contains this text will be deleted
 */
export async function performanceCleanUpTaskTemplateByName(page, taskTemplateName) {
  // navigate to task templates
  await page.locator('#sidebar li:has-text("Tasks")').click();
  await page.locator(`:text("Task Templates"):visible`).click();

  // wait for page to load
  await page.waitForLoadState("domcontentloaded");

  // while taskTemplateName is visible on page, delete templates that contain taskTemplateName in their title
  while (await page.locator(`:text("${taskTemplateName}")`).count()) {
    await page
      .locator(`td tr:has-text("${taskTemplateName}") >> nth=0 >> a .fa-trash`)
      .click();
    await page.waitForTimeout(500);
  }
}

export async function performanceCreateTaskFromTaskPage(page, task = {}, options = {}) {
  const { faker } = npmImports;
  if (!task.subject) task.subject = `New Task ${Date.now()}`;
  if (!task.description) task.description = faker.lorem.sentence(4);

  if (options.navigate) {
    // go to task page
    await page.locator(`#tasks a`).click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
  }

  // click + from top nav
  await page
    .locator(`.tasks-color .action-btns [data-bind="click: $root.newTask"]`)
    .click();

  // Fill out New Task
  const modal = page.locator(`[aria-describedby="newTaskForm"]`);

  // -- Subject
  await modal.locator(`#task-name`).fill(task.subject);

  // -- Description
  await modal.locator(`#task-desc`).fill(task.description);

  if (task.private) {
    // -- Private
    await modal.locator(`[title="Set Private"]`).click();
  }

  if (task.phoneCall) {
    // -- Phone Call
    await modal.locator(`[for="task-phone-call"]`).click();
  }

  if (task.priority) {
    // -- Priority
    await modal.locator(`[for="task-priority"]`).click();
  }

  if (task.tag) {
    // -- Tag
    await modal.locator(`label:has-text("Tags") + .select2-container`).click();
    await page.keyboard.type(task.tag);
    await page.keyboard.press("Enter");
  }

  if (task.assignedTo) {
    // -- Assigned To
    await modal
      .locator(`label:has-text("Assigned To") + .select2-container`)
      .click();
    await page.getByRole("option", { name: task.assignedTo }).click();
  }

  if (task.assignedBy) {
    await modal.locator(`#assignedByTextContainer`).hover();
    await modal.locator(`#assignedByTextContainer .zola-icon-edit`).click();
    await modal
      .locator(`#assignedBySelectContainer .select2-container`)
      .click();
    await page.getByRole("option", { name: task.assignedBy }).click();
  }

  if (task.dueDate) {
    // -- Due Date
    const dueDate = task.dueDateOverride || `${task.dueDate} 10:00 PM`;
    await modal.locator(`#task-due-date-picker`).fill(dueDate);
  }

  if (task.dueDateWTime) {
    // -- Due Date with Time
    const dueDateWTime = task.dueDateWTimeOverride || `${task.dueDateWTime}`;
    await modal.locator(`#task-due-date-picker`).fill(dueDateWTime);
  }

  if (task.status) {
    // -- Status
    await modal
      .locator(`label:has-text("Status") + div .select2-container`)
      .click();
    await page.getByRole("option", { name: task.status }).click();
  }

  if (task.recurrence) {
    // click on recurring tab
    await modal.locator(`#taskTabs [href="#recurring"]`).click();

    // check recurrence
    await modal
      .locator(
        `.RecurrenceEditor:has-text("Recurrence") [type="checkbox"]:visible`,
      )
      .check();

    // click on reccurence type
    await modal
      .locator(
        `li:has(label:has-text("${task.recurrence["type"]}")) [type="radio"]`,
      )
      .click();

    // end by
    await modal
      .locator(`li:has(label:has-text("End by")) [type="radio"]`)
      .click();
    try {
      await page
        .locator(`.rcMainTable td[title="${task.recurrence["endBy"]}"]:visible`)
        .click();
    } catch {
      // if date is next month
      await page.locator(`.rcTitlebar:visible .rcNext`).click();
      await page
        .locator(`.rcMainTable td[title="${task.recurrence["endBy"]}"]:visible`)
        .click();
    }
  }

  if (options.noSubmit) {
    console.warn(` 🟡 Task creation was eneded before submittion 🟡 `);
    return task;
  } else {
    // Click "Save & Close"
    await page
      .locator(`[data-bind="visible: !isUpdate(), click: saveTaskEntry"]`)
      .click();

    // successful toast message
    await expect(
      page.locator(
        `.toast-success:has-text("New Task was added successfully!")`,
      ),
    ).toBeVisible();
    await page
      .locator(`.toast-success:has-text("New Task was added successfully!")`)
      .click();
    await expect(
      page.locator(
        `.toast-success:has-text("New Task was added successfully!")`,
      ),
    ).not.toBeVisible({ timeout: 10000 });
  }
}

/**
 * Cleans up all instance of task by name
 * @param {Object} page - page instance
 * @param {String} task name - any task template with that contains this text will be deleted
 */
export async function performanceCleanUpTaskFromTaskPage(page, taskName) {
  // go to task page
  await page.locator(`#tasks a`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  // search for task
  await page.locator(`#page-search`).click();
  await page.keyboard.type(taskName);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3000);

  if (
    await performanceIsVisible(
      page,
      `#listcontent .super-task-container:has-text("${taskName}"):visible`,
      4000,
    )
  ) {
    while (
      (await page
        .locator(`#listcontent .super-task-container:has-text("${taskName}")`)
        .count()) > 0
    ) {
      const deleteRow = page
        .locator(`#listcontent .super-task-container:has-text("${taskName}")`)
        .first();

      await expect(async () => {
        await deleteRow.locator(`[title="Task Actions"]`).click();

        await deleteRow
          .locator(`.dropdown-menu li:has-text("Delete")`)
          .click({ timeout: 5_000 });
      }).toPass({ timeout: 60 * 1000 });

      if (
        await page
          .locator('#generic-confirm-modal:has-text("dependent steps")')
          .isVisible()
      ) {
        await page.locator("#workflowTaskLeaveDependents").click();
        await page
          .locator('.generic-confirm-choices a:has-text("DELETE")')
          .click();
      } else if (await performanceIsVisible(page, `.recurring-task-dialog`, 1000)) {
        // if recurring event
        await page.locator(`[data-bind="click: deleteSingleTask"]`).click();
      } else {
        // Click delete in modal
        await page.locator(`[role="dialog"] .deleteButtonClass`).click();
      }

      // wait for toast message
      await expect(
        page.locator(`.toast-success:has-text("Task deleted successfully!")`),
      ).toBeVisible();
      await page
        .locator(`.toast-success:has-text("Task deleted successfully!")`)
        .click();
      // await expect(
      //   page.locator(`.toast-success:has-text("Task deleted successfully!")`),
      // ).not.toBeVisible({ timeout: 10000 });
    }
  }
}

/**
 * Cleans up all instance of matter by name
 * @param {Object} page - page instance
 * @param {String} matter name - matter name that will be deleted
 */
export async function performanceCleanUpMatterByName(page, matterName) {
  // Navigate to matter dashboard
  await page.locator(`#navigation [href="/Matters/MatterList2.aspx"]`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000); // Allow table to load

  // Search for matter name
  await page
    .locator(`#page-search`)
    .pressSequentially(matterName, { delay: 25 });
  await page.keyboard.press("Enter");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(10000); // Allow search results to load
  await page.locator(`#matter-view-loading-overlay img`).waitFor({
    state: "hidden",
    timeout: 2 * 60 * 1000,
  });

  if (
    await performanceIsVisible(
      page,
      `table .matter-grid-row:has-text("${matterName}")`,
      5000,
    )
  ) {
    let previousCount = 0;
    let currentCount = await page
      .locator(`table .matter-grid-row:has-text("${matterName}")`)
      .count();

    while (currentCount > 0) {
      // Break if no more matters exist or deletion is not progressing
      if (currentCount === 0 || currentCount === previousCount) break;

      previousCount = currentCount;

      // Accept confirmation dialog
      page.once("dialog", (dialog) => void dialog.accept());

      // Click delete
      await page
        .locator(
          `table .matter-grid-row:has-text("${matterName}") .zola-icon-trash`,
        )
        .first()
        .click();

      // Wait for success toast message
      await expect(
        page.locator(`.toast-success:has-text("Matter successfully deleted")`),
      ).toBeVisible();
      await page
        .locator(`.toast-success:has-text("Matter successfully deleted")`)
        .click();
      // await expect(
      //   page.locator(`.toast-success:has-text("Matter successfully deleted")`),
      // ).not.toBeVisible();

      // Wait for loading overlay to disappear
      await expect(
        page.locator(`div#matter-view-loading-overlay-child img`),
      ).not.toBeVisible({ timeout: 2 * 60 * 1000 });

      // Refresh search results
      await page.locator(`#page-search`).fill(matterName);
      await page.keyboard.press("Enter");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(10000);
      await page.locator(`#matter-view-loading-overlay img`).waitFor({
        state: "hidden",
        timeout: 3 * 60 * 1000,
      });

      // Update currentCount after deletion
      currentCount = await page
        .locator(`table .matter-grid-row:has-text("${matterName}")`)
        .count();
    }
  }
}

/*
 * Cleans up all instance of contact by name
 * @param {Object} page - page instance
 * @param {String} name - contact name that will be deleted
 */
export async function performanceCleanUpContactByName(page, name) {
  // Navigate to contacts page
  await page
    .locator(`#navigation [href="/Contacts/Pages/Contacts.aspx"]`)
    .click();
  await page.waitForLoadState("domcontentloaded");
  // Wait for table to load
  await page.waitForTimeout(2000);

  // Search for matter name
  await page.locator(`#page-search`).fill(name);
  await page.keyboard.press("Enter");
  await page.waitForLoadState("domcontentloaded");

  if (
    await performanceIsVisible(
      page,
      `li[class="eachContact"]:has-text("${name}"):visible`,
      5000,
    )
  ) {
    let previousCount = 0;
    let currentCount = await page
      .locator(`li[class="eachContact"]:has-text("${name}"):visible`)
      .count();

    // Clean up all instances of contact by name
    while (currentCount > 0) {
      // Break if no more contacts or deletion didn't progress
      if (currentCount === 0 || currentCount === previousCount) break;

      previousCount = currentCount;

      // Click delete
      let contactSelector = page
        .locator(`li[class="eachContact"]:has-text("${name}"):visible`)
        .first();
      await contactSelector.locator(`div.contact-list-actions`).hover();
      await contactSelector.locator(`li:has-text("Delete")`).click();

      // Confirm delete
      await page.getByRole(`button`, { name: `Delete` }).click();
      await page.waitForTimeout(2000);

      // Refresh search results
      await page.locator(`#page-search`).fill(name);
      await page.keyboard.press("Enter");
      await page.waitForLoadState("domcontentloaded");

      // Update currentCount after deleting
      currentCount = await page
        .locator(`li[class="eachContact"]:has-text("${name}"):visible`)
        .count();
    }
  }
}

/**
 * Creates a Matter
 * @param {Object} page - page instance
 * @param {Object} :
 *    -- Basic Matter includes name, primaryClient, practiceArea, invoiceTemplate
 */
export async function performanceCreateAMatter(page, matter = {}, submit = true) {
  console.log("DEBUG: Starting performanceCreateAMatter");
  
  // kick out if matter doesnt have minimum
  if (!matter.name) {
    throw new Error(`🛑 Matter must have a name 🛑`);
  } else if (!matter.primaryClient) {
    throw new Error(`🛑 Matter must have a primary client 🛑`);
  } else if (!matter.practiceArea) {
    throw new Error(`🛑 Matter must have a practice area 🛑`);
  }

  console.log("DEBUG: Clicking dashboard link");
  // Click the plus icon in the navbar
  await page.locator(`#dashboard [href="/Dashboard/Dashboard.aspx"]`).click({timeout: 240000});
  
  console.log("DEBUG: Clicking quick add button");
  await page.locator(`#cw-quick-add-button`).click();

  console.log("DEBUG: Clicking new matter link");
  // Select "New Matter" from the dropdown
  await page.locator(`a[href="/Matters/NewMatter.aspx"]`).click({timeout: 240000});
  await page.waitForLoadState("domcontentloaded", { timeout: 240000 });

  console.log("DEBUG: Filling matter name");
  // -- Name
  await page.locator(`#new-matter__matter-name`).fill(matter.name);

  console.log("DEBUG: new-matter-primary-client");
  // -- Primary Client
  try{
    await page.locator('[id*="new-matter-primary-client"]:visible').click({timeout: 240000});
    await page.keyboard.type(matter.primaryClient, { delay: 300 });
    await page.waitForTimeout(2000); // wait for options to load
    await page.getByRole("option", { name: matter.primaryClient, exact: true }).click();
  } catch (e) {
    console.log(`🛑 Retrying selecting primary client :: ${matter.primaryClient} 🛑`);
    await page.locator('[id*="new-matter-primary-client"]:visible').click({timeout: 240000});
    await page.keyboard.type(matter.primaryClient, { delay: 300 });
    await page.waitForTimeout(2000); // wait for options to load
    await page.getByRole("option", { name: matter.primaryClient, exact: true }).click();
  }
  // -- Responsible Attorney
  if (matter.responsibleAttorney) {
    console.log("DEBUG: .initials-user-dropdown-length-1");
    await page.locator(`.initials-user-dropdown-length-1`).first().click();
    await page
      .locator(`#select2-drop [placeholder=""]`)
      .fill(matter.responsibleAttorney);
    await page
      .locator(`[role="option"] :text("${matter.responsibleAttorney}")`)
      .click();
  }

  // -- Originating Attorney
  if (matter.originatingAttorney) {
    console.log("DEBUG: has-text(\"Originating Attorney\")");
    await page
      .locator(`label:has-text("Originating Attorney") + .select2-container`)
      .click();
    await page
      .getByRole("option", { name: matter.originatingAttorney })
      .click();
  }

  // -- Primary Area
  console.log("DEBUG: new-matter-practice-area");
  await page.locator('[id*="new-matter-practice-area"]:visible').click();
  await page.keyboard.type(matter.practiceArea);
  await page.waitForTimeout(2000); // wait for options to load
  await page
    .getByRole("option", { name: matter.practiceArea, exact: true })
    .click();

  // template invoices
  if (!matter.invoiceTemplate) {
    matter.invoiceTemplate = "Default";
  }
  await page
    .locator(
      `.billing-inner-item:has-text("Invoice templates") [id*="select"]:visible`,
    )
    .click();
  await page.keyboard.type(matter.invoiceTemplate);
  await page
    .getByRole("option", { name: matter.invoiceTemplate, exact: true })
    .click();

  // -- User Rate
  if (matter.user && matter.userRate) {
    console.log("DEBUG: new-matter-practice-area");
    // Click the plus icon for a new User Rate -- Currently not in view if debugging (change zoom to 90%)
    await page.locator(`#matter-user-rates-section [value="+"]`).click();

    // Fill out new User and User Rate and save
    await page
      .locator(`[data-bind*="userRatesList"] [data-bind*="numericInput"]`)
      .fill(matter.userRate);

    await page
      .locator(`[data-bind*="userRatesList"] [id*="select"]:visible`)
      .click();
    await page.keyboard.type(matter.user);
    await page.getByRole("option", { name: matter.user }).click();

    await page
      .locator(`[data-bind*="userRatesList"] [data-bind*="saveUserRate"]`)
      .click();
  }

  // -- Time Entry Rule
  if (matter.timeEntryRule) {
    console.log("DEBUG: time-entry-rule-section");
    // Click the plus icon for a new "Time Entry Rule" -- Currently not in view if debugging (change zoom to 90%)
    await page.locator(`#time-entry-rule-section [value="+"]`).click();

    // Fill out new Time Entry Rule
    await page
      .locator(`[data-bind*="timeEntryRuleList"] [id*="select"]:visible`)
      .click();
    await page.keyboard.type(matter.timeEntryRule);
    await page.getByRole("option", { name: matter.timeEntryRule }).click();
    await page.locator(`[data-bind*="saveTimeEntryRule"]`).click(); // click check mark to save
  }
  // -- billingType
  if (matter.billingType) {
    console.log("DEBUG: div.cw-form-group.billing-inner-item");
    await page
      .locator("div.cw-form-group.billing-inner-item .select2-choice")
      .first()
      .click();
    await page.keyboard.type(matter.billingType);
    await page.getByRole("option", { name: matter.billingType }).click();
  }

  if (matter.allocateFlatFeesChecked) {
    await page.locator(`#chk-flat-fee-enabled`).click();
  }

  // -- Split Billing
  if (matter.splitBilling) {
    await page.locator(`#tgSplitBilling`).click();
  }

  // -- Other Contact
  if (matter.otherContact && matter.otherContactRole) {
    await page.locator(`[data-bind*="addOtherContact"]`).click();

    // Fill out Other User
    await page
      .locator(`[data-bind*="otherContactsList"] .select2-choice`)
      .first()
      .click();
    await page.keyboard.type(matter.otherContact);
    await page.getByRole("option", { name: matter.otherContact }).click();

    await page
      .locator(`[data-bind*="otherContactsList"] .select2-choice`)
      .nth(1)
      .click();
    await page.keyboard.type(matter.otherContactRole);
    await page.getByRole("option", { name: matter.otherContactRole }).click();
    await page.locator(`[data-bind*="saveOtherContact"]`).click(); // click checkmark to save
  }
  if (matter.permissionUserOrGroup) {
    await page
      .locator(`input[name="matter-permissions"][value="custom"]`)
      .first()
      .click();
    await page.locator(`.user-custom-list-multiple ul`).first().click();
    await page.keyboard.type(matter.permissionUserOrGroup, { delay: 250 });
    await page
      .locator(`.select2-result li:has-text('${matter.permissionUserOrGroup}')`)
      .click();
  }
  if (matter.deliveryPreference) {
    try {
      await page.getByRole(`link`, { name: `Email PDF` }).click();
    } catch {
      await page
        .locator(`#s2id_nm_prf`)
        .getByRole(`link`, { name: `-Type or Select-` })
        .click();
    }
    await page.keyboard.type(`${matter.deliveryPreference}`);
    await page
      .getByRole(`option`, { name: `${matter.deliveryPreference}` })
      .locator(`span`)
      .click();
  }
  if (matter.toggleLedesBillingOptions) {
    await page.getByLabel(`Enable UTBMS Codes for LEDES Billing`).click();
    await page.getByLabel(`ABA Bankruptcy`).click();
    await page.getByLabel(`ABA Counselling`).click();
    await page.getByLabel(`ABA Litigation`).click();
    await page.getByLabel(`ABA Project`).click();
    await page.getByLabel(`EW Civil Litigation`).click();
    await page.getByLabel(`LOC eDiscovery`).click();
    await page.getByLabel(`LOC Trademark`).click();
    await page.getByLabel(`LOC Patent`).click();
  }

  // -- submit matter
  if (submit) {
    await page.locator(`#create-matter-button`).click({ timeout: 70_000 });
    await page.waitForLoadState("domcontentloaded");
  } else {
    console.warn(`🟡 Matter has not been sumbitted 🟡`);
    return matter;
  }
  
  // Assert redirect to newly created matter
  try {
    await expect(page).toHaveURL(/MatterDetailInfo.aspx/, { timeout: 30_000 });
  } catch {
    // click 'create anyway' for duplicate number matters
    await expect(page.locator("#duplicate-matter-number-modal")).toContainText(
      "There already exists a matter with potentially the same matter number.",
    );
    await page
      .locator('#duplicate-matter-number-modal a:has-text("Create Anyway")')
      .click();
    await expect(page).toHaveURL(/MatterDetailInfo.aspx/, { timeout: 30_000 });
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 120000 });

  // grab matter No
  await page.waitForTimeout(15000);
  const matterNo = await page.locator(`#matterNo`).innerText();

  return {
    matter,
    matterNo,
  };
}

/**
 * Creates a Contact
 * @param {Object} page - page instance
 * @param {Object} :
 *    -- Basic Contact includes firstName, lastName
 */
export async function performanceCreateAContact(page, contact = {}, submit = true) {
  // Data validation
  if (!contact.firstName) {
    throw new Error(`🛑 Contact must have a first name 🛑`);
  } else if (!contact.lastName) {
    throw new Error(`🛑 Contact must have a last name 🛑`);
  } else if (!contact.email) {
    throw new Error(`🛑 Contact must have an email 🛑`);
  }

  // Navigate to contacts page
  await page
    .locator(`#navigation [href="/Contacts/Pages/Contacts.aspx"]`)
    .click();
  await page.waitForLoadState("domcontentloaded");

  // Click the plus icon in the section header
  await page.locator(`div.widget-header >> a:text("+")`).click();

  // Select "New Person" from the dropdown
  await page.locator(`a[onclick="GoToPersonModal();"]`).click();
  await page.waitForLoadState("domcontentloaded");

  // -- First name
  await page.locator(`#person-firstName`).fill(contact.firstName);

  // -- Last name
  await page.locator(`#person-lastName`).fill(contact.lastName);

  // Fill out email
  await page.locator(`input#person-emailAddress`).fill(contact.email);
  await page.locator(`input#person-primary-emailAddress`).check();

  // -- Submit
  if (submit) {
    await page.locator(`#contact-person-modal .save-buttons:visible`).click();
  } else {
    console.warn(`🟡 Contact has not been created 🟡`);
    return contact;
  }

  // Search for new contact
  const fullName = `${contact.firstName} ${contact.lastName}`;
  await page.locator(`#page-search`).fill(fullName);
  await page.keyboard.press("Enter");
  await page.waitForLoadState("domcontentloaded");

  // Assert new contact has been created
  try {
    await expect(
      page
        .locator(`li[class="eachContact"]:has-text("${fullName}"):visible`)
        .first(),
    ).toBeVisible();
  } catch {
    throw new Error(`🛑 Error creating contact 🛑`);
  }
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Creates an Event
 * @param {Object} page - page instance
 * @param {Object} :
 *    -- Basic Event includes Subject
 */
export async function performanceCreateAnEventToAMatter(page, evnt = {}) {
  // kick you out if it does not have basic
  if (!evnt.subject) {
    throw new Error(`🛑 Event must have a Subject 🛑`);
  }

  // Click on the Events tab
  await page.locator(`.events-tab a`).click();

  // Click the plus icon in the "Calendar" section
  await page.locator(`#add-calendar-entry`).click();

  // Click "Create New Event"
  await page.locator(`.drp-down-option:has-text("Create New Event")`).click();

  // Fill out modal with event details array
  // -- subject
  await page.locator(`.event-entry-subject`).fill(evnt.subject);

  // -- location
  if (evnt.location && evnt.city) {
    await page.locator(`#event-entry-location-input`).fill(evnt.location);
    await page
      .locator(
        `.pac-item:has-text("${evnt.location}") span:has-text("${evnt.city}")`,
      )
      .first()
      .click();
  }

  // -- Date
  if (evnt.date) {
    await page.locator(`[data-bind="iCheck: isAllDay"] ins`).click(); // click all day
    await page.locator(".k-select:visible").first().click();
    await page.locator(`[title="${evnt.date}"]:visible`).first().click();

    // -- End Date
    await page.locator(".k-select:visible").nth(1).click();
    await page.locator(`[title="${evnt.date}"]:visible`).first().click();
  } else if (evnt.dateFrom || evnt.dateTo) {
    await page.locator(`#event-entry-kdtp-from`).fill(evnt.dateFrom);
    await page.waitForTimeout(2000);
    await page.locator(`#event-entry-kdtp-to`).fill(evnt.dateTo);
    await page.mouse.click(0, 0);
  }

  // -- Description
  if (evnt.description) {
    await page
      .locator(`[aria-label="Rich Text Editor, calendar-event-description"]`)
      .fill(evnt.description);
  }

  // -- Event Owner and attendee
  if (evnt.owner || evnt.attendee) {
    await page
      .locator(
        `[aria-describedby="event-entry-modal"] label:has-text("Event Owner") + div`,
      )
      .click();
    await page.locator(`#select2-drop [placeholder=""]`).fill(evnt.owner);
    await page.getByRole("option", { name: evnt.owner }).click();

    await page.locator(`[id*=addAttendeeUserSelect]`).first().click();
    await page.locator(`#select2-drop [placeholder=""]`).fill(evnt.attendee);
    await page.getByRole("option", { name: evnt.attendee }).click();
  }

  await page.waitForTimeout(60 * 1000)

  // Click "Save"
  await page.locator(`#event-entry-save-button`).click({ timeout: 90_000 });

  if (
    await performanceIsVisible(
      page,
      `[aria-describedby="event-date-conflict-modal"]`,
      2000,
    )
  ) {
    await page
      .locator(
        `[aria-describedby="event-date-conflict-modal"] [data-bind="click: confirmConflictSave"]`,
      )
      .click();
  }

  // success message should appear
  await expect(
    page.locator(
      `.toast-success:has-text("New Event was added successfully!")`,
    ),
  ).toBeVisible({
    timeout: 2 * 30 * 1000, // can take a while
  });
  
  // Wait for the toast to disappear
  await expect(
    page.locator(
      `.toast-success:has-text("New Event was added successfully!")`,
    ),
  ).not.toBeVisible({ timeout: 10000 });
}

export async function performanceCreateCalendarEvent(page, evnt = {}) {
  if (!evnt.subject) {
    throw new Error(`🛑 Event must have a Subject 🛑`);
  }

  // Click the plus icon in the "Calendar" section
  await page.locator(`#add-calendar-entry`).click();

  // Click "Create New Event"
  await page.locator(`.drp-down-option:has-text("Create New Event")`).click();

  // Fill out modal with event details array
  // -- subject
  await page.locator(`.event-entry-subject`).fill(evnt.subject);

  // -- location
  if (evnt.location && evnt.city) {
    await page.locator(`#event-entry-location-input`).fill(evnt.location);
    await page
      .locator(
        `.pac-item:has-text("${evnt.location}") span:has-text("${evnt.city}")`,
      )
      .click();
  }

  // -- Date
  if (evnt.date) {
    await page.locator(`[data-bind="iCheck: isAllDay"] ins`).click(); // click all day
    await page.locator(".k-select:visible").first().click();
    await page.locator(`[title="${evnt.date}"]:visible`).first().click();

    // -- End Date
    await page.locator(".k-select:visible").nth(1).click();
    await page.locator(`[title="${evnt.date}"]:visible`).first().click();
  } else if (evnt.dateFrom || evnt.dateTo) {
    await page.locator(`#event-entry-kdtp-from`).fill(evnt.dateFrom);
    await page.waitForTimeout(2500);
    await page.locator(`.event-entry-subject`).click();
    await page.waitForTimeout(2500);
    await page.locator(`#event-entry-kdtp-to`).fill(evnt.dateTo);
    await page.mouse.click(0, 0);
  }

  // -- Description
  if (evnt.description) {
    await page
      .locator(`[aria-label="Rich Text Editor, calendar-event-description"]`)
      .fill(evnt.description);
  }

  // -- Event Owner and attendee
  if (evnt.owner || evnt.attendee) {
    await page
      .locator(
        `[aria-describedby="event-entry-modal"] label:has-text("Event Owner") + div`,
      )
      .click();
    await page.getByRole("option", { name: evnt.owner }).click();

    await page.locator(`[id*=addAttendeeUserSelect]`).first().click();
    await page.getByRole("option", { name: evnt.attendee }).click();
  }

  // Matter
  if (evnt.matter) {
    await page
      .locator(`.event-entry-pane-right-right .select2-default`)
      .click();
    await page.keyboard.type(evnt.matter);
    await page.locator(`#select2-drop :text('${evnt.matter}')`).click();
  }

  // Lead
  if (evnt.lead) {
    await page
      .locator(`.event-entry-pane-right-right .select2-default`)
      .click();
    await page.keyboard.type(evnt.lead);
    await page.locator(`#select2-drop :text('${evnt.lead}')`).click();
  }

  // Reminder (object) ( mode = text / notif / email ) | ( interval = min / days / weeks / months )
  if (evnt.reminder) {
    await page.locator(`[data-bind="click: addReminder"]`).click();

    if (evnt.reminder.number) {
      await page
        .locator(`.event-entry-input-reminderQuantity`)
        .fill(`${evnt.reminder.number}`);
    }
    if (evnt.reminder.mode) {
      await page
        .locator(
          `.event-reminder-type-switcher:has-text('${evnt.reminder.mode}')`,
        )
        .click();
    }
    if (evnt.reminder.interval) {
      await page
        .locator(
          `.event-reminder-value-type-switcher:has-text('${evnt.reminder.interval}')`,
        )
        .click();
    }
  }

  if (!evnt.dontSave) {
    // Click "Save"
    await page.locator(`#event-entry-save-button`).click();

    // ignore date conflict if exists
    try {
      await page
        .locator(`#event-date-conflict-modal-ok`)
        .click({ timeout: 1000 });
    } catch (e) {
      //console.error(e);
    }

    if (!evnt.dontCheck) {
      // success message should appear
      await expect(await page.getByText(`New Event was added`)).toBeVisible({
        timeout: 2 * 30 * 1000, // can take a while
      });
      console.log("checking checking checking");
      await expect(page.getByText(`New Event was added`)).not.toBeVisible();
    }
  }
}

export async function performanceSearchForCalendarEvent(page, title) {
  try {
    await page.locator(`.filter-wrapper span`).click({ timeout: 3000 });
  } catch (e) {
    console.error(e);
  }
  await expect(async () => {
    await page.locator(`#page-search`).click();
    await page.waitForTimeout(1000);
    await expect(page.locator(`#page-search`)).toBeFocused({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
  await page.keyboard.type(title, { delay: 100 });
  await page.waitForTimeout(1000);
  await page.keyboard.press("Enter");
}

/**
 * Creates a User
 * @param {Object} page - page instance
 * @param {Object} :
 *    -- Basic Event includes Subject
 */
export async function performanceCreateAUser(page, user = {}) {
  // Data validation
  if (!user.firstName) {
    throw new Error(`🛑 User must have a first name 🛑`);
  } else if (!user.lastName) {
    throw new Error(`🛑 User must have a last name 🛑`);
  } else if (!user.email) {
    throw new Error(`🛑 User must have an email 🛑`);
  }

  if (!user.role) user.role = "Staff";
  if (!user.type) user.type = "Attorney";

  // Navigate to firm settings
  await page.locator(`#imgUserPic`).click();
  await page.locator(`:text("Firm Settings")`).click();

  // Select the "Users & Groups" menu
  await page.locator(`a:text("Users & Groups")`).click();

  // Click the plus icon
  await page.locator(`#add-new-user`).click();
  await page.waitForLoadState("domcontentloaded");

  // Setup iframe
  const frame = await (
    await page.waitForSelector(
      `iframe[src="/Settings/TabPages/Newuser.aspx?isPopup=1&"]`,
    )
  ).contentFrame();

  // Fill out all inputs with user object
  await frame
    .locator(`input:below(span:has-text("First Name"))`)
    .first()
    .fill(user.firstName);
  await frame
    .locator(`input:below(span:has-text("Last Name"))`)
    .first()
    .fill(user.lastName);
  await frame
    .locator(`input:below(span:has-text("Email"))`)
    .first()
    .fill(user.email);
  await frame.locator(`a:below(span:has-text("Role"))`).first().click();
  await frame.locator(`ul.rcbList >> li:text-is("${user.role}")`).click();
  await frame.locator(`a:below(span:has-text("Type"))`).first().click();
  await frame.locator(`ul.rcbList >> li:text-is("${user.type}")`).click();

  // Click and drag modal into view
  // Will not click the send button unless the window is dragged
  await page.locator(`div[id="TB_title"]`).hover();
  await page.mouse.down();
  await page.mouse.move(600, -10);
  await page.mouse.up();

  // Click "Send Invite"
  await frame.locator(`input[value="Send Invite"]`).click();

  // Assert new user is visible
  const userLine = page.locator(
    `tbody[role="rowgroup"]:visible >> tr:has-text("${user.firstName} ${user.lastName}")`,
  );
  await expect(userLine).toBeVisible({ timeout: 120000 });
}

/**
 * Cleans up all instance of user by name
 * @param {Object} page - page instance
 * @param {String} name - user name that will be deleted
 */
export async function performanceCleanUpUserByName(page, user, options = {}) {
  // Navigate to firm settings
  await page.locator(`#imgUserPic`).click();
  await page.getByRole("link", { name: "Firm Settings" }).click();

  // Select the "Users & Groups" menu
  await page.locator(`a:text("Users & Groups")`).click();

  if (
    await performanceIsVisible(
      page,
      `tbody[role="rowgroup"]:visible >> tr:has-text("${user}")`,
      5000,
    )
  ) {
    // Clean up all instances of user by name
    while (
      await page
        .locator(`tbody[role="rowgroup"]:visible >> tr:has-text("${user}")`)
        .count()
    ) {
      const userLine = page
        .locator(`tbody[role="rowgroup"]:visible >> tr:has-text("${user}")`)
        .first();

      let actionTaken = false;

      if (options.deactivate) {
        const deactivateButton = userLine.locator(`a:text("Deactivate")`);
        if (await deactivateButton.isVisible()) {
          await deactivateButton.click();
          await page.getByRole(`button`, { name: `close` }).click();
          await deactivateButton.click();
          await page.waitForTimeout(2000);
          await page.evaluate(() => {
            document.body.style.zoom = "0.6";
          });
          await page.getByRole(`button`, { name: `Deactivate` }).click();

          await expect(
            page.locator(
              `div.toast-message:has-text("User successfully deactivated.")`,
            ),
          ).toBeVisible();

          // Wait for the toast to disappear
          await expect(
            page.locator(
              `div.toast-message:has-text("User successfully deactivated.")`,
            ),
          ).not.toBeVisible({ timeout: 10000 });

          actionTaken = true;
        }
      }

      if (!actionTaken) {
        // If deactivation wasn't possible, proceed with deletion
        const deleteButton = userLine.locator(`a:text("Delete")`);
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          await page.getByRole(`button`, { name: `close` }).click();
          await deleteButton.click();
          await page.waitForTimeout(2000);
          await page.evaluate(() => {
            document.body.style.zoom = "0.6";
          });

          await page.getByRole(`button`, { name: `Delete` }).click();
          await expect(
            page.locator(
              `div.toast-message:has-text("User successfully deactivated.")`,
            ),
          ).toBeVisible();

          // Wait for the toast to disappear
          await expect(
            page.locator(
              `div.toast-message:has-text("User successfully deactivated.")`,
            ),
          ).not.toBeVisible({ timeout: 10000 });
        }
      }
    }
  }
}

/**
 * Deletes an Event
 * @param {Object} page - page instance
 * @param {string} event name
 */
export async function performanceDeleteAnEventFromMatter(page, eventName) {
  // Click on the Events tab
  await page.locator(`.events-tab a`).click();

  // check to see if event is visible
  if (
    await performanceIsVisible(
      page,
      `[data-bind*="events"] tr:has-text("${eventName}")`,
      5000,
    )
  ) {
    while (
      await page
        .locator(`[data-bind*="events"] tr:has-text("${eventName}")`)
        .count()
    ) {
      const row = page.locator(
        `[data-bind*="events"] tr:has-text("${eventName}")`,
      );

      // Hover over the event kebab menu
      await row.locator(".cw-grid-actions").click();

      // Click the "Edit Event" option
      await page
        .locator(`.cw-grid-action-menu [data-bind*="deleteEvent"]`)
        .click();

      // Click "Delete" on the delete confirmation modal
      await page.locator(`.deleteButtonClass`).click();
      //--------------------------------
      // Assert:
      //--------------------------------
      // Assert "Event has been successfully deleted." toast notification is visible
      await expect(
        page.locator(
          `.toast-success:has-text("Event has been successfully deleted.")`,
        ),
      ).toBeVisible();
      
      // Wait for the toast to disappear
      await expect(
        page.locator(
          `.toast-success:has-text("Event has been successfully deleted.")`,
        ),
      ).not.toBeVisible({ timeout: 10000 });
    }

    // shoud no longer see row
    await expect(
      page.locator(`[data-bind*="events"] tr:has-text("${eventName}")`),
    ).not.toBeVisible();
  } else {
    console.warn(`🟡 No Events by the name ${eventName} have been found! 🟡`);
  }
}

/**
 * set all workflow templates containing title to inactive, with 'deprecated' in title
 * @param {Object} page - page instance
 * @param {String} workflowTitle - substring of title of workflow templates to be deprecated:
 */
export async function performanceDeprecateWorkflowTemplate(page, workflowTitle) {
  // navigate to workflow templates
  await page.locator(`#avatar-dropdown-toggle`).click();
  await page.locator(`:text("Firm Settings")`).click();

  // navigate to Events & Calendar Rules > Workflow Templates
  await page.locator(`li :text("Events & Calendar Rules")`).click();
  await page.waitForTimeout(10 * 1000);
  await page.locator(`li a:text-is("Workflow Templates")`).click();

  // declare firmSettingsFrame
  // const firmSettingsFrame = page.frameLocator(`.iframeWrapper:visible iframe`);

  // assert page loaded before entering while loop
  await page.locator(`h3:text-is("Personal Injury")`).waitFor();
  await page.waitForTimeout(5000);

  while (await page.locator(`tr:has-text("${workflowTitle}")`).count()) {
    // click edit button for first item with title
    await page
      .locator(`a[id="icon-edit"]:right-of(:text("${workflowTitle}")) >> nth=0`)
      .click();
    // change name to 'deprecate (date)'
    await page
      .locator(`[placeholder="Enter a Workflow Template name"]`)
      .fill(`deprecate ${Date.now().toString()}`);
    // set inactive if not already inactive
    if (
      await page
        .locator(`.cw-row:has-text("workflows allow") label:text-is("Active")`)
        .count()
    ) {
      await page.locator(`#toggle-active-status`).click();
    }
    // save
    await page.locator(`#workflow-canvas-holder .btn-primary`).click();
    // assert toast and dismiss
    await expect(page.locator(`#toast-container`)).toHaveText(
      `Workflow saved successfully!`,
    );
    await page.locator(`#toast-container`).click();
    await expect(page.locator(`#toast-container`)).not.toBeVisible();
    // navigate back to workflow template list
    await page.locator(`.back-to-page a`).click();
    // assert page loaded before re-entering while loop
    await expect(page.locator(`h3:text-is("Personal Injury")`)).toBeVisible();
  }
}

/**
 * Add a time entry to a Matter
 * @param {Object} page - page instance
 * @param {Object} timeEntry:
 */
export async function performanceAddTimeEntryToAMatter(page, timeEntry = {}) {
  const { dateFns, faker } = npmImports;

  // Get today date EST time
  const date = new Date();
  let todayEST = date.toLocaleString("en-US", { timeZone: "America/New_York" });
  todayEST = new Date(todayEST);

  // Populate time entry object with defaults if needed
  let givenWorkType = false;
  if (!timeEntry.date) timeEntry.date = dateFns.format(todayEST, "MM/dd/yyyy");
  if (!timeEntry.duration)
    timeEntry.duration = faker.datatype.number({ min: 1, max: 9 }).toString();
  if (!timeEntry.workType) {
    timeEntry.workType = "Court";
  } else {
    givenWorkType = true;
  }

  if (!timeEntry.narrative && !timeEntry.narrativeOverride)
    timeEntry.narrative = faker.lorem.sentence();
  if (!timeEntry.rate)
    timeEntry.rate = faker.datatype
      .number({ min: 10, max: 99, precision: 0.01 })
      .toString();

  // Click on the "Time/Expenses" tab
  await page.locator(`.rtsLI:has-text("Time/Expenses")`).click();

  // Click the plus icon in the section header
  const frame = await (await page.waitForSelector("#Iframe6")).contentFrame();
  await page.waitForTimeout(10000);
  await frame.locator(`#add-new-time-entry`).click();

  // Fill out the inputs with the details object
  // -- Date
  await page.locator(`#te_duration [aria-label="select"]`).click();
  await page.locator(`#te_durDate`).fill(timeEntry.date);
  await page.keyboard.press("Enter");
  // -- Duration
  await page.locator(`#te_durationVal`).fill(timeEntry.duration);
  // -- Charge
  if (timeEntry.noCharge) {
    await page.locator(`#chkNoCharge`).check();
  } else if (timeEntry.noChargeNoShow) {
    await page
      .locator(`#duration-and-nocharge [data-bind="checked: isNcds"]`)
      .check();
  }
  if (timeEntry.defaultCheckboxes) {
    // no charge check box
    const noChargecheckbox = page.locator("#chkNoCharge");
    // Uncheck the no charge checkbox if it is checked
    if (await noChargecheckbox.isChecked()) {
      await noChargecheckbox.uncheck();
    }
    // Locate the "No charge, Dont show" checkbox
    const noChargeDScheckbox = page.locator("#chkNCDS");

    // Uncheck the checkbox if it is checked
    if (await noChargeDScheckbox.isChecked()) {
      await noChargeDScheckbox.uncheck();
    }
  }
  // -- Work Type
  try{
    await page.locator(`[id*="workTypes"] [id*="chosen"]`).click();
    await page.waitForTimeout(1000);
    await page.keyboard.type(timeEntry.workType);
    //await page.waitForTimeout(5000);
    await page.getByRole("option", { name: timeEntry.workType }).click();
  } catch (e) {
    console.log(`🛑 Retrying work type selection due to error: ${timeEntry.workType}`);
    await page.locator(`[id*="workTypes"] [id*="chosen"]`).click();
    await page.waitForTimeout(1000);
    await page.keyboard.type(timeEntry.workType);
    //await page.waitForTimeout(5000);
    await page.getByRole("option", { name: timeEntry.workType }).click();
  }
  await page.waitForTimeout(2000);
  // -- Tasks
  if (timeEntry.tasks) {
    await page.getByRole(`link`, { name: `-Type or Select-` }).click();
    await page.getByRole(`option`, { name: timeEntry.tasks }).click();
  }

  // -- Narrative
  // if (!timeEntry.narrativeOverride) {
  //   await page
  //     .getByRole('textbox', { name: 'NARRATIVE' })
  //     .fill(timeEntry.narrative);
  // }

  if (timeEntry.timeKeeper) {
    await page
      .locator(`label:has-text('Time Keeper') + .select2-container`)
      .click();
    await page.keyboard.type(timeEntry.timeKeeper);
    await page.waitForTimeout(5000);
    await page.getByRole("option", { name: timeEntry.timeKeeper }).click();
    await page.waitForTimeout(2000);
  }
  // -- Rate
  await page.locator(`[data-bind="value: rate"]:visible`).fill(timeEntry.rate);

  // Click "Save & New"
  await page.locator(`#btnSaveNew`).click();

  // Close Time Entry Modal
  await page
    .locator(`[aria-describedby="timeEntryForm"] [title="close"]`)
    .click();

  // Assert "Time Entry was added successfully!" toast notification is visible
  await expect(
    page.locator(
      `.toast-success:has-text("Time Entry was added successfully!")`,
    ),
  ).toBeVisible();
  await page
    .locator(`.toast-success:has-text("Time Entry was added successfully!")`)
    .click();
  await expect(
    page.locator(
      `.toast-success:has-text("Time Entry was added successfully!")`,
    ),
  ).not.toBeVisible({ timeout: 10000 });

  const total = (+timeEntry.duration * +timeEntry.rate).toFixed(2).toString();
  timeEntry.total = total;

  return timeEntry;
}

/**
 * Function to go to matter regardless of location in website
 * @param {Object} page - page instance
 * @param {string} matter name:
 */
export async function performanceGoToMatter(page, matterName) {
  // Navigate to matter dashboard
  await page.locator(`#navigation [href="/Matters/MatterList2.aspx"]`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000); // wait for table to load

  // Search for matter name
  await page.locator(`#page-search`).fill(matterName);
  await page.keyboard.press("Enter");
  await page.waitForLoadState("domcontentloaded"); // 15
  await page.waitForTimeout(10_000);

  // Wait until loading overlay is no longer visible
  await page.waitForSelector("#matter-view-loading-overlay", {
    state: "hidden",
    timeout: 60 * 1000,
  });

  // Navigate to matter
  await page
    .locator(
      `[role="row"]:has([role="gridcell"]:text-is("${matterName}")) a:has-text("${matterName}")`,
    )
    .first()
    .click();
  await page.waitForLoadState("domcontentloaded");

  // Wait again to ensure the page is fully loaded
  await page.waitForSelector("#matter-view-loading-overlay", {
    state: "hidden",
  });
}

export async function performanceGoToMatterModified(page, matterName) {
  // Navigate to matter dashboard
  await page.locator('#navigation [href="/Matters/MatterList2.aspx"]').click();
  await page.waitForLoadState("domcontentloaded");

  // Wait for the table to load
  await page.waitForSelector("table.matter-grid-row, #page-search");
  await page.waitForTimeout(2000);

  // Search for the matter
  await page.locator("#page-search").fill(matterName);
  await page.keyboard.press("Enter");

  // Wait for search results and loading overlay to disappear
  await page.waitForTimeout(500);
  await page.waitForSelector("#matter-view-loading-overlay", {
    state: "hidden",
  });
  await page.waitForTimeout(2000);

  // locate matter
  const row = page.locator("tr.matter-grid-row").filter({
    has: page.locator(`td`, { hasText: matterName }),
  });

  // Click the matter name link to go into detail view
  await row.locator(`a:has-text("${matterName}")`).click();
  await page.waitForLoadState("domcontentloaded");
}

export async function performanceGoToLead(page, lead) {
  // click into CRM page
  //await page.locator(`#crm`).click();
  await page.locator(`#crm [href="/CRM/Leads.aspx"]`).click({timeout: 240000});
  await page.waitForLoadState("domcontentloaded");

  // search for lead name
  await page.locator(`#page-search`).fill(lead.fName);
  await page.keyboard.press("Enter");
  await page.waitForLoadState("domcontentloaded");

  // Open lead page
  await page
    .locator(`.crm-body a:text-is("${lead.fName} ${lead.lName}")`)
    .click();
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Add a note to a matter
 * @param {Object} page - page instance
 * @param {Object} note:
 * `-- base: Title and body
 */
export async function performanceAddNoteToAMatter(page, note) {
  // Data validation
  if (!note.title) {
    throw new Error(`🛑 Note must have a Title 🛑`);
  } else if (!note.body) {
    throw new Error(`🛑 Note must have a Body 🛑`);
  }

  // Click the "Notes" tab
  await page.locator(`.rtsLI:has-text("Notes")`).click();

  if (note.folderName) {
    // if note needs to be in a folder

    if (
      await performanceIsVisible(
        page,
        `.jstree-anchor:has-text("${note.folderName}")`,
        5000,
      )
    ) {
      // create a folder if needed
      // Right-Click on the folder with the matter name on the far left section
      await page.locator(`#folder-root_anchor`).click({ button: "right" });

      // Click the "Create" option
      await page.locator(`ul:has-text("Create"):visible`).click();

      // Hit "Enter"
      await page.keyboard.press("Enter");

      // Right-Click on the new folder
      await page
        .locator(`a.jstree-anchor:has-text("New folder") >> nth=0`)
        .click({ button: "right" });

      // Rename the folder
      await page.locator(`ul:has-text("Rename"):visible`).click();
      await page.locator(`.jstree-rename-input`).fill(note.folderName);
      await page.keyboard.press("Enter");
    }

    // click into folder
    await page
      .locator(`a.jstree-anchor:has-text("${note.folderName}") >> nth=0`)
      .click();
  }

  // click add note
  await page.locator(`[data-bind="click: createNoteAction"]`).click();

  // Fill the note subject with sample text
  await page.locator(`#matterNoteSubj`).fill(note.title);

  // Fill the note body with sample text
  const frame = await (
    await page.waitForSelector(`iframe[class="cke_wysiwyg_frame cke_reset"]`)
  ).contentFrame();
  await frame.locator(`body`).fill(note.body);

  // Click the "Save" button
  await page.locator(`a:has-text("Save"):visible`).click();

  // Assert "Note ${name} created!" is visible
  await expect(
    page.locator(`div.toast-message:has-text('Note "${note.title}" created!')`),
  ).toBeVisible();
  
  // Wait for the toast to disappear
  await expect(
    page.locator(`div.toast-message:has-text('Note "${note.title}" created!')`),
  ).not.toBeVisible({ timeout: 10000 });
}

/**
 * Add a flat fee to a matter
 * @param {Object} page - page instance
 * @param {Object} flatFee:
 */
export async function performanceAddAFlatFeeToAMatter(page, flatFee = {}) {
  const { faker } = npmImports;
  // Populate time entry object with defaults if needed
  if (!flatFee.serviceType) flatFee.serviceType = "Consultation fee";
  if (!flatFee.quantity)
    flatFee.quantity = faker.datatype.number({ min: 1, max: 20 }).toString();
  if (!flatFee.description) flatFee.description = faker.lorem.sentence();
  if (!flatFee.rate)
    flatFee.rate = faker.datatype
      .number({ min: 10, max: 99, precision: 0.01 })
      .toString();

  // Click on the "Time/Expenses" tab
  await page.locator(`.rtsLI:has-text("Time/Expenses")`).click();

  // Click on the "Flat Fees" section
  const frame = await (await page.waitForSelector("#Iframe6")).contentFrame();
  await frame.locator(`#flatfees`).click();

  // Click the plus icon in the section header
  await frame.locator(`#add-new-flatfee`).click();

  // Fill all input fields from the details object

  // -- Service Type
  await page.locator(`#NewFlatFeeModal #s2id_drpflatfeeEntryServices`).click();
  await page.keyboard.type(flatFee.serviceType);
  await page.getByRole("option", { name: flatFee.serviceType }).click();

  // -- Quantity
  await page
    .locator(`#NewFlatFeeModal [data-bind="value: quantity"]`)
    .fill(flatFee.quantity);

  // -- Rate
  await page
    .locator(`#NewFlatFeeModal [data-bind="value: rate"]`)
    .fill(flatFee.rate);

  // -- Description
  await page
    .locator(`#NewFlatFeeModal [data-bind="value: description"]`)
    .fill(flatFee.description);

  // Click "Save"
  await page.locator(`[data-bind="click: saveFlatFee"]`).click();

  // Assert "Saved Successfully" toast notification is visible
  await expect(
    page.locator(`.toast-success:has-text("Saved Successfully")`),
  ).toBeVisible();
  
  // Wait for the toast to disappear
  await expect(
    page.locator(`.toast-success:has-text("Saved Successfully")`),
  ).not.toBeVisible({ timeout: 10000 });

  return flatFee;
}

/**
 * Add an expense to a matter
 * @param {Object} page - page instance
 * @param {Object} expense:
 *  -- required: type
 */
export async function performanceAddAnExpenseToAMatter(page, expense, matter) {
  const { dateFns, faker } = npmImports;
  // Data validation
  if (!expense.type) {
    throw new Error(
      `🛑 Expense must have a type 🛑 ("Check", "Expense", or "Credit Card")`,
    );
  }

  // Click on the "Time/Expenses" tab
  await page.locator(`.rtsLI:has-text("Time/Expenses")`).click();

  // Click on the "Expenses" section
  const frame = await (await page.waitForSelector("#Iframe6")).contentFrame();
  await frame.locator(`#expenses`).click();

  // Click the plus icon in the section header
  await frame.locator(`#add-expense-entry`).click();

  switch (expense.type) {
    case "Check":
      // Populate expense object with defaults if needed
      if (!expense.account) expense.account = "Operating Account";
      if (!expense.payableTo) expense.payableTo = "Leslie Knope";
      if (!expense.street) expense.street = "123 Main St.";
      if (!expense.city) expense.city = "Seattle";
      if (!expense.state) expense.state = "WA";
      if (!expense.zipCode) expense.zipCode = "98101";
      if (!expense.memo) expense.memo = faker.lorem.sentence();
      if (!expense.date)
        expense.date = dateFns.format(new Date(), "MM/dd/yyyy");
      if (!expense.amount)
        expense.amount = faker.datatype
          .number({ min: 10, max: 99, precision: 0.01 })
          .toString();
      if (!expense.assignedAccount)
        expense.assignedAccount = "Accounts Receivable";
      if (!expense.description) expense.description = faker.lorem.sentence();
      if (!expense.sampleFile) expense.sampleFile = "avatar.png";

      // Click the option "New Check (hard-cost)"
      await frame
        .locator(`.drp-down-option a:has-text("New Check (hard-cost)")`)
        .click();

      // Fill all input fields from the details object
      // -- New Check Account
      await page
        .locator('label:has-text("Account") + .new-chk__cell a')
        .click();
      await page.getByRole("option", { name: expense.account }).click();

      // -- Payable to
      await page
        .locator(
          'label:has-text("Payable To") + .new-chk__select-flt .select2-choice',
        )
        .click();
      console.log(`Typing payable to: ${expense.payableTo}`);
      await page.keyboard.type(expense.payableTo);
      await page.waitForTimeout(5000);
      try {
        await page.getByRole("option", { name: expense.payableTo }).click();
      } catch (e) {
        console.log(`Could not find exact match for payable to: ${expense.payableTo}, trying fuzzy match`); 
        await page.getByRole("option", { name: ` ${expense.payableTo}` }).locator('span').click();
      }
      
      console.log(`Add address details`);
      // -- Address
      await page.locator(`.new-chk__streetaddress`).fill(expense.street);
      await page.locator(`.new-chk__city`).fill(expense.city);
      await page.locator(`.new-chk__state`).fill(expense.state);
      await page.locator(`.new-chk__zip`).fill(expense.zipCode);

      // -- Date
      await page
        .locator(
          `[for="new-chk-datepicker"] + .new-chk__date .k-datepicker .k-select`,
        )
        .click();
      await page.locator("#new-chk-datepicker").fill(expense.date);

      // -- Amount
      await page
        .locator(
          '.new-chk__box_right label:has-text("Amount") + div [data-bind*="numericInput"]',
        )
        .fill(expense.amount);

      // -- Memo
      await page.locator(`.new-chk__memo`).fill(expense.memo);

      // -- Assign Account
      await page.getByRole("link", { name: "Select..." }).click();
      await page.getByRole("option", { name: expense.assignedAccount }).click();

      // -- Description
      await page
        .locator(`.line-item .det__desc textarea`)
        .fill(expense.description);

      // // -- Attachment
      // page.once("filechooser", async (chooser) => {
      //   await setFilesWithLogging(chooser, `src/artillery/scenarios/${expense.sampleFile}`, "Check Expense");
      // });
      // await page.click("#new-check-document-file-input");

      // Click "Save & Close"
      await page
        .locator(`#new-check-dlg [type="submit"]:has-text("Save & Close")`)
        .click();
      
      await page.waitForTimeout(1000);
      // Assert "Check created successfully!" toast notification
      try{
        await expect(
          page.locator(
            `div.toast-message:has-text("Check created successfully!")`,
          ),
        ).toBeVisible();
      } catch (e) {
        console.log(`Check created toast not found, waiting longer...`);
      }  

      
      try{
        // Wait for the toast to disappear
        await expect(
          page.locator(
            `div.toast-message:has-text("Check created successfully!")`,
          ),
        ).not.toBeVisible({ timeout: 10000 });
      } catch (e) {
        console.log(`Check created toast did not disappear in time.`);
      }
      return expense;

    case "Expense":
      // Populate expense object with defaults if needed
      if (!expense.softCostType && expense.softCostType !== false) {
        expense.softCostType = "QA";
      }

      if (!expense.description) expense.description = faker.lorem.sentence();
      if (!expense.quantity)
        expense.quantity = faker.datatype
          .number({ min: 1, max: 20 })
          .toString();
      if (!expense.price)
        expense.price = faker.datatype
          .number({ min: 10, max: 99, precision: 0.01 })
          .toString();

      // Click the option "New Expense (soft-cost)"
      await frame.locator(`a:has-text("New Expense (soft-cost)")`).click();

      // Fill all input fields from the details object
      // Fill out soft cost type
      // Fill out soft cost type only if it's not false
      if (expense.softCostType !== false) {
        await page
          .locator(
            `b[role="presentation"]:below(label:has-text("Soft Cost Type")):visible >> nth=0`,
          )
          .click();

        await page
          .locator(`input.select2-input:visible`)
          .fill(expense.softCostType);
        await page.getByRole("option", { name: expense.softCostType }).click();
      }

      // Fill out description
      await page.locator(`#sc_SoftCostDesc`).fill(expense.description);

      // Fill out quantity
      await page.locator(`#sc_SoftCostQtn`).fill(expense.quantity);

      // Fill out unit price
      await page.locator(`#sc_SoftCostPrice`).fill(expense.price);

      // Click "Save & Close"
      await page.locator(`#scBtnSave:visible`).click();

      // Assert "New expense was added successfully!" toast notification is visible
      await expect(
        page.locator(
          `div.toast-message:has-text("New expense was added successfully!")`,
        ),
      ).toBeVisible();
      await page
        .locator(
          `div.toast-message:has-text("New expense was added successfully!")`,
        )
        .click();
      await expect(
        page.locator(
          `div.toast-message:has-text("New expense was added successfully!")`,
        ),
      ).not.toBeVisible();
      return expense;

    case "Credit Card": {
      {
        // Populate expense object with defaults if needed
        if (!expense.account) expense.account = "QA Wolf Card 1";
        if (!expense.payableTo) expense.payableTo = "Leslie Knope";
        if (!expense.memo) expense.memo = faker.lorem.sentence();
        if (!expense.amount)
          expense.amount = faker.datatype
            .number({ min: 10, max: 99, precision: 0.01 })
            .toString();
        if (!expense.assignedAccount1)
          expense.assignedAccount1 = "Accounts Receivable";
        if (!expense.assignedAccount2)
          expense.assignedAccount2 = "Accumulated Depreciation";
        if (!expense.description1)
          expense.description1 = faker.lorem.sentence();
        if (!expense.description2)
          expense.description2 = faker.lorem.sentence();
        if (!expense.sampleFile) expense.sampleFile = "avatar.png";

        // Click the option "New Credit Card (hard-cost)"
        await frame
          .locator(`.invoice-options a:has-text("New Credit Card (hard-cost)")`)
          .click();

        // Click the plus icon in the "Assign Accounts & Matters" section
        try {
          await page
            .locator(`input[type="button"]:visible`)
            .click({ timeout: 5 * 1000 });
        } catch {
          await page.keyboard.press("Escape");
          await page.locator(`input[type="button"]:visible`).click();
        }

        // Fill out all fields with the input object
        // -- Account
        await page
          .locator(`b:below(label[for="new-creditcard-accounts"]) >> nth=0`)
          .click();
        await page.keyboard.type(expense.account);
        await page.getByRole("option", { name: expense.account }).click();
        // -- Payable To
        await page
          .locator(`b:below(label:text-is("Payable To"):visible) >> nth=0`)
          .click();
        await page.keyboard.type(expense.payableTo);
        await page.getByRole("option", { name: expense.payableTo }).click();
        // -- Memo
        await page.locator(`input.new-creditcard__memo`).fill(expense.memo);
        // -- Amount
        await page.locator(`input#new-creditcard-amount`).fill(expense.amount);

        // -- Account 1
        let accountLine1 = await page.locator(
          `table.new-creditcard-items >> tbody >> tr >> nth=0`,
        );
        // -- -- Assigned Account
        await accountLine1.locator(`div#s2id_ddlAccounts`).click();
        await page
          .locator(
            `li >> div.select2-result-label:text-is("${expense.assignedAccount1}")`,
          )
          .click();
        // -- -- Description
        await accountLine1.locator(`textarea`).fill(expense.description1);
        // -- -- Amount
        await accountLine1
          .locator(`input.num-field`)
          .fill(String((Number(expense.amount) - 1).toFixed(2)));

        // -- Account 2
        const accountLine2 = await page.locator(
          `table.new-creditcard-items >> tbody >> tr >> nth=1`,
        );

        // -- -- Assigned Account
        await accountLine2.locator(`div#s2id_ddlAccounts`).click();
        await page
          .locator(
            `li >> div.select2-result-label:text-is("${expense.assignedAccount2}")`,
          )
          .click();
        // -- -- Description
        await accountLine2.locator(`textarea`).fill(expense.description2);
        // -- -- Amount
        await accountLine2.locator(`input.num-field`).fill("1.00");
        // -- -- Matter
        await accountLine2.locator(`#s2id_nc-matter-dp`).click();
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(1000);
        await page.getByRole("option", { name: `${matter.name}` }).click();

        // // Upload a sample file
        // page.once("filechooser", async (chooser) => {
        //   await setFilesWithLogging(chooser, `src/artillery/scenarios/${expense.sampleFile}`, "Credit Card Expense")
        //     .catch(console.error);
        // });
        // await page.click("div.accounting-modal-document-attach-btn:visible");

        // Click "Save & Close"
        await page.locator(`button:has-text("Save & Close"):visible`).click();

        // Assert "Credit Card created successfully!" toast notification is visible
        await expect(
          page.locator(
            `.toast-success:has-text("Credit Card created successfully!")`,
          ),
        ).toBeVisible();
        
        // Wait for the toast to disappear
        await expect(
          page.locator(
            `.toast-success:has-text("Credit Card created successfully!")`,
          ),
        ).not.toBeVisible({ timeout: 10000 });
        return expense;
      }
    }
    default:
      throw new Error(
        `🛑 Invalid Type! Must be: "Check", "Expense", or "Credit Card" 🛑`,
      );
  }
}

export async function performanceInvoiceMatter(page, matter, options = {}) {
  const { dateFns } = npmImports;
  const { stayOnPage = false } = options;
  // Click on the "Time/Expenses" tab
  await page.locator(`.rtsLI:has-text("Time/Expenses")`).click();

  // grab iframe
  let frame = await (await page.waitForSelector("#Iframe6")).contentFrame();

  // Click on the "Time Entries" section
  await frame.locator(`a#time-entries`).click();

  // Click the "Invoice Unbilled Activities" icon
  await frame.locator(`a#openUnbilledInvoicesBtn`).click();

  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });

  //await page.waitForTimeout(12_000);

  // Select "Manually select Items"
  // await page
  //   .getByRole(`radio`, { name: `Manually select Items` })
  //   .click({ timeout: getArtilleryAwareTimeout(8000) })
  //   .catch(console.error);
  console
  await page.check('#manuallySelectItems');
  // check all & generate invoice
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(8_000);
  await page.waitForLoadState("domcontentloaded");

  await page.locator(`#hoursrange`).click();
  await page.getByRole(`listitem`).filter({ hasText: `Today` }).first().click();
  await page.locator(`#hoursrange`).click();
  await page.getByRole(`listitem`).filter({ hasText: `Show All` }).click();
  await page.waitForTimeout(2000);
  await page.locator(`#chkToggleAll`).click();

  //await page.getByRole(`button`, { name: `Generate Invoice` }).click();

  const generateInvoiceBtn = page.getByRole('button', { name: 'Generate Invoice' });
  await page.locator('#searching-overlay').waitFor({
    state: 'hidden',
    timeout: 30000
  });
  await expect(generateInvoiceBtn).toBeEnabled({ timeout: 30000 });
  await generateInvoiceBtn.click();	
	
  if (options.invoiceDate) {
    let days = options.invoiceDate;
    await page
      .locator(`label:has-text("Invoice Date") + .k-datepicker input`)
      .fill(days);
    await page.mouse.click(0, 0);
    await page.waitForTimeout(2_000);
  }
  if (options.dueDate) {
    let days = options.dueDate;
    let date = dateFns.format(
      new Date().setDate(new Date().getDate() + days),
      "MM/dd/yyyy",
    );
    await page
      .locator(`label:has-text("Due Date") + .k-datepicker input`)
      .fill(date);
    await page.mouse.click(0, 0);
  }
  if (options.pastDueDate) {
    let days = options.pastDueDate;
    await page
      .locator(`label:has-text("Due Date") + .k-datepicker input`)
      .click();
    await page
      .locator(`label:has-text("Due Date") + .k-datepicker input`)
      .fill(days);
    await page.mouse.click(0, 0);
  }

  await page.waitForTimeout(5000);

  //await page
  //  .getByLabel(`Generate Invoice`)
  //  .getByText(`Generate`, { exact: true })
  //  .click();
  
  await page.getByLabel('Generate Invoice').waitFor();
  const btn = page.getByLabel('Generate Invoice');
  // // Wait until button becomes enabled
  await expect(btn).toBeEnabled({ timeout: 30000 });
  // // Click
  await btn.getByText('Generate', { exact: true }).click();
  
  await expect(
    page.locator(`.toast-success:has-text("Generated invoices: ")`),
  ).toBeVisible();
  let splitInvoice = await page.locator(`.toast-success`).innerText();
  let invoiceNo = splitInvoice.split(": ")[1];
  
  // Wait for the toast to disappear
  await expect(
    page.locator(`.toast-success:has-text("Generated invoices: ")`),
  ).not.toBeVisible({ timeout: 10000 });

  if (stayOnPage === true) {
    await page.goBack();
    await page.waitForLoadState("domcontentloaded");
    // Click on the "Invoices" tab
    await page.locator(`.rtsLI:has-text("Invoices")`).click();
    return { invoiceNo: invoiceNo.replace(/\.$/, "") };
  }

  // Click on the "Invoices" tab
  await page.locator(`.rtsLI:has-text("Invoices")`).click();

  return { invoiceNo: invoiceNo.replace(/\.$/, "") };
}

/**
 * Add a trust/retainer payment to a matter
 * @param {Object} page - page instance
 * @param {Object} payment:
 *  -- required: type
 */
export async function performanceAddARetianerPaymentToAMatter(page, payment) {
  const { faker } = npmImports;
  // Populate payment object with defaults if needed
  if (!payment.account) payment.account = "Operating Account";
  if (!payment.amount)
    payment.amount = faker.datatype
      .number({ min: 10, max: 99, precision: 0.01 })
      .toString();
  if (!payment.paymentMethod) payment.paymentMethod = "Credit Card";
  if (!payment.referenceNo)
    payment.referenceNo = faker.datatype
      .number({ min: 1000, max: 9999 })
      .toString();
  if (!payment.note) payment.note = faker.lorem.word();
  // add zero if needed
  if (
    payment.amount.includes(".") &&
    payment.amount.split(".")[1].length === 1
  ) {
    payment.amount = payment.amount + "0";
  }

  // Click the "Invoices" tab
  await page.locator(`.rtsLink:has-text("Invoices")`).click();

  // Click the plus icon in the section header
  let frame = await (await page.waitForSelector("#Iframe7")).contentFrame();
  await frame.locator(`.picture-icon .add-btn`).click();

  // Click the link for a "New Trust/Retainer Payment"
  await frame.locator(`.lnk-new-retainer`).click();

  // Fill out the input fields from the payment object
  const modal = page.locator(`#new-retainer-dlg`);
  // -- Account
  await modal
    .locator(`label:has-text("To Account") + div .new-pmt__ddlTo a`)
    .click();
  await page.getByRole("option", { name: payment.account }).click();
  // -- Amount
  await modal
    .locator(`label:has-text("Amount") + div input`)
    .fill(payment.amount);
  // -- Payment Method
  await modal
    .locator(
      `label:has-text("Payment Method") + div .retainer-payment-method a`,
    )
    .click();
  await page.locator(`span:text-is("${payment.paymentMethod}")`).click();
  // -- Ref No
  if (payment.paymentMethod !== "Cash") {
    await modal
      .locator(`label:has-text("Reference no.") + div input`)
      .fill(payment.referenceNo);
  }
  // -- Note
  await modal.locator(`label:has-text("Note") + div input`).fill(payment.note);

  // Click "Create Retainer"
  await modal.locator(`button:has-text("Create Retainer")`).click();

  // Assert "Retainer created" toast notification is visible
  await expect(
    page.locator(`.toast-success:has-text("Retainer created")`),
  ).toBeVisible();
  
  // Wait for the toast to disappear
  await expect(
    page.locator(`.toast-success:has-text("Retainer created")`),
  ).not.toBeVisible({ timeout: 10000 });

  return payment;
}

export async function performanceCleanUpCalendarByName(page, calendarName) {
  await page.locator(`#calendar [href="/Calendar/Calendar.aspx"]`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);
  await page.locator(`#page-search`).click();
  await page.keyboard.type(calendarName, { delay: 100 });
  await page.keyboard.press("Enter");
  if (
    await performanceIsVisible(
      page,
      `.calendar-search-result-item a:has-text("${calendarName}")`,
      3000,
    )
  ) {
    while (
      await page
        .locator(`.calendar-search-result-item a:has-text("${calendarName}")`)
        .count()
    ) {
      await page.locator(`.calendar-search-result-item a`).first().click();
      await page.locator(`#event-entry-modal .btn-danger`).click();
      await page
        .locator(`div.generic-confirm-choices a:has-text("Delete"):visible`)
        .click();
      await page.waitForTimeout(2000);
    }
  }
  await expect(
    page.locator(
      `.calendar-search-result-grid-empty:has-text("There are no events that match your search")`,
    ),
  ).toBeVisible();
}

export async function performanceAddTaskToAMatter(page, task, options = {}) {
  const { dateFns, faker } = npmImports;
  if (!task.name) {
    task.name = `New Task`;
  }
  if (!task.dueDate) {
    task.dueDate = dateFns.format(
      new Date().setDate(new Date().getDate() + 1),
      "MM/dd/yyyy h:00 a",
    );
  }
  if (!task.description) task.description = faker.lorem.sentence(4);

  // Click the "Tasks" tab
  await page.locator(`.tasks-tab .rtsLink:has-text("Tasks")`).click();

  // Click the plus icon in the Tasks section
  await page.locator(`[data-bind="click: $root.newTask"]`).click();

  // Fill out New Task
  const modal = page.locator(`[aria-describedby="newTaskForm"]`);

  // -- name
  await modal.locator(`#task-name`).fill(task.name);

  // -- Description
  await modal.locator(`#task-desc`).fill(task.description);

  if (task.private) {
    // -- Private
    await modal.locator(`[title="Set Private"]`).click();
  }

  if (task.phoneCall) {
    // -- Phone Call
    await modal.locator(`[for="task-phone-call"]`).click();
  }

  if (task.priority) {
    // -- Priority
    await modal.locator(`[for="task-priority"]`).click();
  }

  if (task.tag) {
    // -- Tag
    await modal.locator(`label:has-text("Tags") + .select2-container`).click();
    await page.keyboard.type(task.tag);
    await page.keyboard.press("Enter");
  }

  if (task.assignedTo) {
    // -- Assigned To
    await modal
      .locator(`label:has-text("Assigned To") + .select2-container`)
      .click();
    await page.getByRole("option", { name: task.assignedTo }).click();
  }

  if (task.assignedBy) {
    await modal.locator(`#assignedByTextContainer`).hover();
    await modal.locator(`#assignedByTextContainer .zola-icon-edit`).click();
    await modal
      .locator(`#assignedBySelectContainer .select2-container`)
      .click();
    await page.getByRole("option", { name: task.assignedBy }).click();
  }

  if (task.dueDate) {
    // -- Due Date
    await modal
      .locator(`#task-due-date-picker`)
      .fill(`${task.dueDate} 10:00 PM`);
  }

  if (task.dueDateWTime) {
    // -- Due Date
    await modal
      .locator(`#task-due-date-picker`)
      .fill(`${task.dueDateWTime} 10:00 PM`);
  }

  if (task.status) {
    // -- Status
    await modal
      .locator(`label:has-text("Status") + div .select2-container`)
      .click();
    await page.getByRole("option", { name: task.status }).click();
  }

  if (task.recurrence) {
    // click on recurring tab
    await modal.locator(`#taskTabs [href="#recurring"]`).click();

    // check recurrence
    await modal
      .locator(
        `.RecurrenceEditor:has-text("Recurrence") [type="checkbox"]:visible`,
      )
      .check();

    // click on reccurence type
    await modal
      .locator(
        `li:has(label:has-text("${task.recurrence["type"]}")) [type="radio"]`,
      )
      .click();

    // end by
    await modal
      .locator(`li:has(label:has-text("End by")) [type="radio"]`)
      .click();
    try {
      await page
        .locator(`.rcMainTable td[title="${task.recurrence["endBy"]}"]:visible`)
        .click();
    } catch {
      // if date is next month
      await page.locator(`.rcTitlebar:visible .rcNext`).click();
      await page
        .locator(`.rcMainTable td[title="${task.recurrence["endBy"]}"]:visible`)
        .click();
    }
  }

  if (options.noSubmit) {
    console.warn(` 🟡 Task creation was eneded before submittion 🟡 `);
    return task;
  } else {
    // Click "Save & Close"
    await page
      .locator(`[data-bind="visible: !isUpdate(), click: saveTaskEntry"]`)
      .click();

    // successful toast message
    await expect(
      page.locator(
        `.toast-success:has-text("New Task was added successfully!")`,
      ),
    ).toBeVisible();
    await page
      .locator(`.toast-success:has-text("New Task was added successfully!")`)
      .click();
    await expect(
      page.locator(
        `.toast-success:has-text("New Task was added successfully!")`,
      ),
    ).not.toBeVisible();
  }
}

export async function performanceCleanUpDeposit(page, accountName) {
  await page
    .locator(`#accounting [href="/Accounting/Accounting.aspx#openbill"]`)
    .click();
  await page.waitForLoadState("domcontentloaded");
  await page.locator(`#BodyPlaceholder_banksAndRegisters`).click();
  await page.locator(`[for="ddlAccounts"] + br + .select2-container`).click();
  await page.getByRole("option", { name: accountName }).click();
  await page.waitForTimeout(2000);
  if (await performanceIsVisible(page, `#grdUndeposited .line-item `, 2000)) {
    while (await page.locator(`#grdUndeposited .line-item`).count()) {
      await page.once("dialog", async (dialog) => await dialog.accept());

      // click delete on first line
      await page
        .locator(`#grdUndeposited .line-item >> nth = 0 >> .fa-trash-o`)
        .click();

      await page.waitForTimeout(2500);
    }
  }
}

export async function performanceApproveInvoice(page, identifer) {
  // click invoice tab
  await page.locator(`.rtsLI:has-text("Invoices")`).click();

  // Approve invoice
  let frame = await (await page.waitForSelector("#Iframe7")).contentFrame();
  let invoiceRow = frame.locator(`tbody tr:has-text("${identifer}")`);
  const invoiceNo = await invoiceRow
    .locator(`td.accounting-checkbox + td >> a`)
    .innerText();

  // -- Click the kebab menu
  await invoiceRow.locator(`a.invoice-action-list`).click();

  // -- Click the option "Approve"
  await invoiceRow
    .locator(`a.invoice-options-link:has-text("Approve")`)
    .click();

  // -- Click the approval confirmation
  await page.mouse.wheel(0, 400);
  await frame.locator(`button#btnModalApprove`).click();
  await page.waitForTimeout(4000); // wait for approval to process


  return invoiceNo;
}

export async function performancePayInvoice(page, identifer) {
  // click Open Filter
  let frame = await (await page.waitForSelector("#Iframe7")).contentFrame();
  await frame.locator(`#btnOpen`).click();

  // open new tab
  const [invoiceTab] = await Promise.all([
    page.waitForEvent("popup"),
    frame.locator(`a:has-text("${identifer}")`).click(),
  ]);
  await invoiceTab.waitForLoadState("domcontentloaded");

  // open action and pay invoice
  await invoiceTab.locator(`.m-action-list`).click();
  await invoiceTab.locator(`li:has-text("Record Payment")`).click();

  // -- Payer Type
  try {
    await invoiceTab.getByRole("option", { name: "Primary Client" }).click();
  } catch {
    await invoiceTab.locator(`.new-pmt__ddlPayerType:visible`).first().click();
    await invoiceTab.getByRole("option", { name: "Primary Client" }).click();
  }

  // -- Payment Method
  await invoiceTab
    .locator(`label:has-text("Payment By") + div .select2-container`)
    .click();
  await invoiceTab.getByRole("option", { name: "Cash" }).click();

  // click save
  await invoiceTab
    .locator(`.ui-dialog:visible .right-buttons a:text-is("Save")`)
    .click();
  await invoiceTab.waitForTimeout(4000); // wait for payment to be saved
  await invoiceTab.close();

 // await frame.locator(`[onclick="RefreshGrid()"]`).click();
 // await frame.locator(`.zola-icon-refresh zola-icon`).click(); // wait for grid to refresh
  await frame.locator(`#btnPaid`).click();
}

export async function performanceAddDocumentToAMatter(page, fileName) {
  const onlyFileName = path.basename(fileName);
  console.log(`Uploading document: ${onlyFileName}`);
  // click document tab
  await page.locator(`.rtsLink:has-text("Documents")`).click();

  // drag and drop img
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 4));
  await dragAndDropElement(
    page,
    `.documents-list .document-list-empty-message img`,
    `.documents-list .document-list-empty-message`,
  );
  await page.waitForTimeout(2000);
  page.once("filechooser", async (chooser) => {
    await setFilesWithLogging(chooser, `${fileName}`, "Document to Matter (Primary)");
  });
  await page.locator(`#DocumentUploadDropzone`).click();
  await page
    .locator(
      `#upload-documents-modal [data-bind*="click: uploadBulkDocuments"]`,
    )
    .click();
  
  await page.waitForTimeout(2000);

  // successful toast message
  await expect(
      page.locator(`.toast-success:has-text("Files uploaded successfully.")`),
    ).toBeVisible({ timeout: 5000 });

  // should be a visible option
  await page
    .locator(`#upload-documents-modal a:has-text("Complete Upload")`)
    .click();
  
  //await page.waitForTimeout(2000);

  await expect(
    page.locator(
      `#document-list-grid tr:has-text("${onlyFileName.split(".")[0]}"):visible`,
    ),
  ).toBeVisible();

  const docRow = page.locator(
    `#document-list-grid tr:has-text("${onlyFileName.split(".")[0]}"):visible`,
  );

  return docRow;
}

export async function performanceDeleteDocFromMatter(page, fileName, portalDoc = false) {
  if (fileName.includes(".")) {
    fileName = fileName.split(".")[0];
  }

  // click document tab
  await page.locator(`.rtsLink:has-text("Documents")`).click();

  if (portalDoc) {
    // click into shared via portal
    await page.locator(`#aClientDocs`).click();
  }

  // check to see if a document is present
  if (
    await performanceIsVisible(
      page,
      `#document-list-grid tr:has-text("${fileName}"):visible`,
      4000,
    )
  ) {
    const docRow = page.locator(
      `#document-list-grid tr:has-text("${fileName}"):visible`,
    );

    // hover over edited row
    await docRow.hover();

    // click more actions
    await docRow
      .locator(
        `.dropdown .doc-list-hoveraction:has-text("More Actions"):visible`,
      )
      .click();

    // click delete
    await docRow
      .locator(`.document-action-menu-text:has-text("Delete"):visible`)
      .click();

    // click Delete document in modal
    await page
      .locator(`#confirm-modal .btn:has-text("Delete Document")`)
      .click();

    // doc row should be deleted
    await expect(docRow).not.toBeVisible();
  }
}

export async function performanceDeleteDocumentTemplateByName(page, fileName, options = {}) {
  if (fileName.includes(".")) {
    fileName = fileName.split(".")[0];
  }

  if (options.crm) {
    // click into Document tab
    await page.locator(`.rtsLink:has-text("Document")`).click();
  } else {
    // click document tab
    await page.locator(`.documents-tab a`).click();
  }

  // click document templates tab
  await page.locator(`.document-templates-tab`).click();

  if (options.crm) {
    try {
      // open accordian dropdown
      await page
        .locator(`.seeMoreButton:has-text("Display Templates")`)
        .click();
    } catch (e) {
      console.error(e);
    }
  }

  // if file name is visible
  if (
    await performanceIsVisible(
      page,
      `.document-list-grid tr:has-text("${fileName}"):visible`,
      5000,
    )
  ) {
    let attempts = 0;
    while (
      (await page
        .locator(`.document-list-grid tr:has-text("${fileName}"):visible`)
        .count()) > 0 &&
      attempts < 15
    ) {
      let delRow = page
        .locator(`.document-list-grid tr:has-text("${fileName}"):visible`)
        .first();
      await delRow.locator(`.del-doc`).click();
      await page.locator(`#confirm-modal-template .btn`).click();
      await page.waitForTimeout(2000);
      attempts++;
    }
  }

  await expect(
    page.locator(`.document-list-grid tr:has-text("${fileName}"):visible`),
  ).not.toBeVisible();
}

export async function performanceCleanUpSubAccountByName(page, subAccountName) {
  if (
    await performanceIsVisible(
      page,
      `#grdAccounts tbody tr:has-text("${subAccountName}")`,
      5000,
    )
  ) {
    let attempts = 0;
    while (
      (await page
        .locator(`#grdAccounts tbody tr:has-text("${subAccountName}")`)
        .count()) > 0 &&
      attempts < 10
    ) {
      let testRow = page
        .locator(`#grdAccounts tbody tr:has-text("${subAccountName}")`)
        .first();

      // click trash icon
      await testRow.locator(`.zola-icon-trash`).click();
      await page.waitForTimeout(1000);
      attempts++;
    }

    await expect(
      page.locator(`#grdAccounts tbody tr:has-text("${subAccountName}")`),
    ).not.toBeVisible();
  }
}

export async function performanceAddSubAccountIfNeeded(page, subAccount) {
  if (
    await performanceIsVisible(
      page,
      `#grdAccounts tbody tr:has-text("${subAccount.name}")`,
      5000,
    )
  ) {
    console.warn(
      ` 🟢 Sub Account with the name ${subAccount.name} already created 🟢 `,
    );
  } else {
    // click + icon from right top corner
    await page.locator(`.accounting-tab-header-section .add-btn`).click();

    // click new account
    await page.locator(`#liNewAccount`).click();

    // Fill out modal
    const modal = page.locator(`[aria-describedby="account-modal"]`);

    // -- Account Type
    await modal.locator(`label:has-text("Account Type") + .drop-down`).click();
    await page.keyboard.type(subAccount.type);
    await page.getByRole("option", { name: subAccount.type }).click();

    // -- Account Number
    await modal
      .locator(`label:has-text("Account Number") + input`)
      .fill(subAccount.number);

    // -- Account Name
    await modal
      .locator(`label:has-text("Account Name") + input`)
      .fill(subAccount.name);

    // -- Check "Is Sub Account"
    await modal.locator(`#chkIsSubAccount`).check();

    // -- Parent Account
    await modal
      .locator(`label:has-text("Parent Account") + .drop-down`)
      .click();
    await page.keyboard.type(subAccount.parentAccount);
    await page.getByRole("option", { name: subAccount.parentAccount }).click();

    // click Save
    await modal.locator(`[data-bind=" click: saveAccount"]`).click();

    // test row should be visible
    await expect(
      page.locator(`#grdAccounts tbody tr:has-text("${subAccount.name}")`),
    ).toBeVisible();
  }
}

export async function performanceCleanUpJournalEntries(page, identifer) {
  if (
    await performanceIsVisible(
      page,
      `#grdCategoriesItems tr:has-text("${identifer}")`,
      3000,
    )
  ) {
    while (
      (await page
        .locator(`#grdCategoriesItems tr:has-text("${identifer}")`)
        .count()) > 0
    ) {
      let testRow = page
        .locator(`#grdCategoriesItems tr:has-text("${identifer}")`)
        .first();

      page.once("dialog", (dialog) => void dialog.accept());
      await testRow.locator(`.fa-trash-o`).click();
      await page.waitForTimeout(5000);
      await page.locator(`.register-refresh`).click();
      await page.waitForLoadState("domcontentloaded");
    }

    await expect(
      page.locator(`#grdCategoriesItems tr:has-text("${identifer}")`),
    ).not.toBeVisible();
  }
}

export async function performanceCleanUpVendorBills(page, identifier) {
  const maxRetries = 10; // Set a maximum number of retries to avoid infinite loops
  let retryCount = 0;
  // Check initial visibility
  if (
    await performanceIsVisible(
      page,
      `#vendor-bill-grid tr:has-text("${identifier}")`,
      5000,
    )
  ) {
    // While loop with upper limit
    while (
      (await performanceIsVisible(
        page,
        `#vendor-bill-grid tr:has-text("${identifier}")`,
        2000,
      )) &&
      retryCount < maxRetries
    ) {
      retryCount++; // Increment the count

      let testRow = page
        .locator(`#vendor-bill-grid tr:has-text("${identifier}")`)
        .first();

      if (
        (await performanceIsVisible(testRow, `.vb-status:has-text("Paid")`, 2000)) ||
        (await performanceIsVisible(testRow, `.vb-status:has-text("Partial Paid")`, 2000))
      ) {
        await testRow.locator(`[role="gridcell"] a`).first().click();

        if (await performanceIsVisible(page, `.inv_v_tbl .fa-trash`, 3000)) {
          // Clean up payments if needed
          while (await performanceIsVisible(page, `.inv_v_tbl .fa-trash`, 3000)) {
            let trashCan = page.locator(`.inv_v_tbl .fa-trash`).first();
            await page.once("dialog", async (dialog) => await dialog.accept());
            await trashCan.click();
          }
        }
        // Close vendor bill view
        await page.locator(`[data-bind="click: resetButtons"]`).click();
      }
      await page.once("dialog", async (dialog) => await dialog.accept());
      await testRow.locator(`.fa-trash`).click();
      await page.waitForTimeout(2000);
    }
    // Check if retries exceeded the maximum limit
    if (retryCount >= maxRetries) {
      console.log(
        "Exceeded maximum retries. Exiting loop to avoid infinite run.",
      );
    }
    // Assert that the element is no longer visible
    await expect(
      page.locator(`#vendor-bill-grid tr:has-text("${identifier}")`),
    ).not.toBeVisible();
  }
}

export async function performanceCleanUpVendorBillsWithSearch(page, identifier) {
  await page.getByRole(`link`, { name: ` Accounting` }).click();
  await page.getByRole(`link`, { name: `Vendors & Bills` }).click();
  await page.locator(`#search-vb a`).click();
  try {
    await page
      .locator(`#s2id_vendor-list-adv-search`)
      .getByRole(`link`, { name: `Type or Select` })
      .click();
    await page.keyboard.type(identifier);
    if (
      await page
        .locator(`#select2-results-33`)
        .getByText(`No matches found`)
        .isVisible()
    ) {
      await page.mouse.click(0, 0);
      return;
    }
    await page.getByRole(`option`, { name: identifier }).click();
    await page.locator(`#vb-adv-search-btn`).click();
  } catch {
    await page.reload();
    await page.locator(`#search-vb a`).click();
    await page
      .locator(`#s2id_vendor-list-adv-search`)
      .getByRole(`link`, { name: `Type or Select` })
      .click();
    await page.keyboard.type(identifier);
    await page.getByRole(`option`, { name: identifier }).click();
    await page.waitForTimeout(3_000);
    await page.locator(`#vb-adv-search-btn`).click();
  }

  const maxRetries = 10; // Set a maximum number of retries to avoid infinite loops
  let retryCount = 0;
  // Check initial visibility
  if (
    await performanceIsVisible(
      page,
      `#vendor-bill-grid tr:has-text("${identifier}")`,
      5000,
    )
  ) {
    // While loop with upper limit
    while (
      (await performanceIsVisible(
        page,
        `#vendor-bill-grid tr:has-text("${identifier}")`,
        2000,
      )) &&
      retryCount < maxRetries
    ) {
      retryCount++; // Increment the count

      let testRow = page
        .locator(`#vendor-bill-grid tr:has-text("${identifier}")`)
        .first();

      if (
        (await performanceIsVisible(testRow, `.vb-status:has-text("Paid")`, 2000)) ||
        (await performanceIsVisible(testRow, `.vb-status:has-text("Partial Paid")`, 2000))
      ) {
        await testRow.locator(`[role="gridcell"] a`).first().click();

        if (await performanceIsVisible(page, `.inv_v_tbl .fa-trash`, 3000)) {
          // Clean up payments if needed
          while (await performanceIsVisible(page, `.inv_v_tbl .fa-trash`, 3000)) {
            let trashCan = page.locator(`.inv_v_tbl .fa-trash`).first();
            await page.once("dialog", async (dialog) => await dialog.accept());
            await trashCan.click();
          }
        }
        // Close vendor bill view
        await page.locator(`[data-bind="click: resetButtons"]`).click();
      }
      await page.once("dialog", async (dialog) => await dialog.accept());
      await testRow.locator(`.fa-trash`).click();
      await page.waitForTimeout(2000);
    }
    // Check if retries exceeded the maximum limit
    if (retryCount >= maxRetries) {
      console.log(
        "Exceeded maximum retries. Exiting loop to avoid infinite run.",
      );
    }
    // Assert that the element is no longer visible
    await expect(
      page.locator(`#vendor-bill-grid tr:has-text("${identifier}")`),
    ).not.toBeVisible();
  }
}

export async function performanceCleanUpCheck(page, identifier) {
  if (
    await performanceIsVisible(
      page,
      `#grdCategoriesItems tr:has-text("${identifier}")`,
      10000,
    )
  ) {
    // set a count
    let attempts = 0;
    // cap the amount of tries to avoid infinite loop
    const maxAttempts = 10;

    while (
      (await page
        .locator(`#grdCategoriesItems tr:has-text("${identifier}")`)
        .count()) > 0
    ) {
      if (attempts >= maxAttempts) {
        console.error(`Exceeded maximum attempts to clean up: ${identifier}`);
        break;
      }

      let testRow = page
        .locator(`#grdCategoriesItems tr:has-text("${identifier}")`)
        .first();

      await page.once("dialog", async (dialog) => await dialog.accept());
      await testRow.locator(`.fa-trash-o`).click();
      await page.waitForTimeout(5_000);
      // click refresh on the table
      await page.locator(`.widget-header__refresh a`).click();
      // wait another 3 secs
      await page.waitForTimeout(3_000);

      attempts++;
    }

    await expect(
      page.locator(`#grdCategoriesItems tr:has-text("${identifier}")`),
    ).not.toBeVisible();
  }
}

export async function performanceAddNewVendorBill(page, vendorBill) {
  const { dateFns, faker } = npmImports;
  // Populate vendor bill object with defaults if needed
  if (!vendorBill.vendor) vendorBill.vendor = "Joker's Fireworks";
  if (!vendorBill.memo) vendorBill.memo = faker.lorem.sentence();
  if (!vendorBill.billNo)
    vendorBill.billNo = faker.datatype
      .number({ min: 10000, max: 99999 })
      .toString();
  if (!vendorBill.account) vendorBill.account = "QA Wolf Card 1";
  if (!vendorBill.description) vendorBill.description = faker.lorem.sentence();
  if (!vendorBill.amount)
    vendorBill.amount = faker.datatype
      .number({ min: 10, max: 99, precision: 0.01 })
      .toFixed(2)
      .toString();
  if (!vendorBill.date)
    vendorBill.date = dateFns.format(new Date(), "M/d/yyyy");

  // Click the Vendors & Bills tab to make sure we're on the Vendors & Bills tab
  await page.getByRole(`link`, { name: `Vendors & Bills` }).click();

  // click + icon from right top corner
 // await page.locator(`.accounting-tab-header-section .add-btn:visible`).click();
  await page.locator(`.vendors-specific-options .plus-icon-container .add-btn`).click();

  // click on New vendor Bill
  await page.locator(`li a:has-text("New Vendor Bill")`).click();

  // Fill out New Vendoe Bill
  let modal = page.locator(`#animatedModal`);

  // -- Vendor
  await modal
    .locator(`label:has-text("Vendor") + div .select2-container`)
    .click();
  await page.keyboard.type(`${vendorBill.vendor}`);
  await page.getByRole("option", { name: vendorBill.vendor }).first().click();

  // -- Memo
  await modal
    .locator(`label:has-text("Memo") + textarea`)
    .fill(vendorBill.memo);

  // -- Bill NO.
  await modal
    .locator(`label:has-text("Bill No") + div input`)
    .fill(vendorBill.billNo);

  // -- Bill Date and Due Date
  await modal.locator(`#vb-dp-bill-date`).fill(vendorBill.date);
  await modal.locator(`#vb-dp-due-date`).fill(vendorBill.date);

  // -- Account (Under Line Items)
  await modal
    .locator('.select2-container.vb-line-acc .select2-choice').click();
  await page.keyboard.type(vendorBill.account);
  await page.getByRole("option", { name: vendorBill.account }).click();

  // -- Description (Under Line Items)
  await modal
    .locator(`textarea[class="vb-detail-text-input"]`)
    .fill(vendorBill.description);

  // -- Amount (Under Line Items)
  await modal
    .locator(`.vb-det-td-amount .vb-detail-text-input`)
    .fill(vendorBill.amount);

  // -- Matter (Under Line items)
  if (vendorBill.matterNo) {
    await modal.locator(`.det__matter .select2-default:visible`).click();
    await page.keyboard.type(vendorBill.matterNo);
    await page
      .getByRole("option", { name: vendorBill.matterNo })
      .first()
      .click();
  }

  // -- Click Save (Under Line Items)
  await modal.locator(`[data-bind="click: $root.saveDetail"]`).click();

  // -- Save Vendor Bill
  await page.locator(`[data-bind="click: saveVendorBill"]`).click();

  // successful toast message
  await expect(
    page.locator(`.toast-success:has-text("Successfull!")`),
  ).toBeVisible();
  
  // Wait for the toast to disappear
  await expect(
    page.locator(`.toast-success:has-text("Successfull!")`),
  ).not.toBeVisible({ timeout: 10000 });

  return vendorBill;
}

export async function performanceAddVendor(page, vendor = {}) {
  const { faker } = npmImports;
  if (!vendor.name) vendor.name = faker.name.findName(); // Generates a random name
  if (!vendor.email) vendor.email = faker.internet.email(); // Generates a random email
  if (!vendor.website) vendor.website = faker.internet.url(); // Generates a random URL
  if (!vendor.phoneNumber) vendor.phoneNumber = faker.phone.phoneNumber(); // Generates a random phone number
  if (!vendor.street) vendor.street = faker.address.streetAddress(); // Generates a random street address
  if (!vendor.city) vendor.city = "New York"; // Static value
  if (!vendor.state) vendor.state = "New York"; // Static value
  if (!vendor.zip) vendor.zip = faker.address.zipCode(); // Generates a random ZIP code
  if (!vendor.notes) vendor.notes = faker.lorem.sentence(); // Generates a random sentence

  // Go to accounting module, Vendors & Bills Tab
  await page.locator(`#accounting`).click();
  await page.getByRole(`link`, { name: `Vendors & Bills` }).click();

  await page.waitForLoadState("domcontentloaded");

  // Click on the plus button and click "New Vendor"
  try {
    await page.locator(`.vendors-specific-options a.plus-icon`).click();
  } catch (e) {
    await page.getByRole(`link`, { name: `Vendors & Bills` }).click();
    await page.waitForLoadState("domcontentloaded");
    await page.locator(`.vendors-specific-options a.plus-icon`).click();
  }

  await page.locator(`ul.dropdown-menu a:text-is("New Vendor")`).click();

  // Fill in the new vendor fields
  await page.locator(`#vendor-name`).fill(vendor.name);
  // Add the vendor website
  await page
    .locator(
      `#vendor-website-section input[data-bind="value: website"]:visible`,
    )
    .fill(vendor.website);
  // Add the vendor email
  await page.locator(`#vendor-emailAddress:visible`).fill(vendor.email);
  // Add vendor phone number
  await page
    .locator(
      `#vendor-phone-number-section input[data-bind="value: phoneNumber"]:visible`,
    )
    .fill(vendor.phoneNumber);
  // Add the street address
  await page
    .locator(`input[data-bind="value: addressName"]:visible`)
    .fill(vendor.street);
  // Add the city
  await page
    .locator(`input[data-bind="value: addressCity"]:visible`)
    .fill(vendor.city);
  // Add the state
  await page
    .locator(`input[data-bind="value: addressState"]:visible`)
    .fill(vendor.state);
  // Add the zipcode
  await page
    .locator(`input[data-bind="value: addressZip"]:visible`)
    .fill(vendor.zip);

  // Set the country to USA
  await page
    .locator(`.cw-form-group:has-text("Country") b[role="presentation"]`)
    .click();
  await page.locator(`ul.select2-results li:has-text("USA")`).click();

  // Add Vendor Notes
  await page
    .locator(`textarea[data-bind="value: notes"]:visible`)
    .fill(vendor.notes);

  // Save the vendor by clicking save button
  await page
    .locator(
      `a[data-bind="visible: isNew(), click: createVendor"]:has-text("Save")`,
    )
    .click();

  return vendor;
}

// vendor clean up function
export async function performanceVendorCleanup(page, vendorName) {
  // Go to accounting module, Vendors & Bills Tab
  await page.locator(`#accounting`).click();
  await page.getByRole(`link`, { name: `Vendors & Bills` }).click();

  await page.waitForLoadState("domcontentloaded");

  // Click View Vendors button
  await page.locator(`:text("View Vendors >")`).click();
  await page.waitForLoadState("domcontentloaded");

  // Filter by vendor
  await page.locator(`#page-search:visible`).fill(vendorName);

  await page.locator(`div.contacts-adv-search i.fa-search`).click();

  if (await performanceIsVisible(page, `.cBasicInfo:has-text("${vendorName}")`, 5000)) {
    // clean up all instances of the vendor by name
    while (
      await page.locator(`.cBasicInfo:has-text("${vendorName}")`).count()
    ) {
      // Get the card element
      const firstCard = page
        .locator(
          `[id^="contactIndex_"]:has-text("${vendorName}") div.contact-list-actions`,
        )
        .first();
      // Click the three dots next to the vendor
      await firstCard.click();

      // Click the delete option
      await firstCard.locator(`li:has-text("Delete")`).click();

      // Successful toast message
      await expect(
        page.locator(`.toast-success:has-text("Vendor deleted successfully")`),
      ).toBeVisible();
      await expect(
        page.locator(`.toast-success:has-text("Vendor deleted successfully")`),
      ).not.toBeVisible({ timeout: 10000 });

      // search for matter name
      await page.locator(`#page-search:visible`).fill(vendorName);
      await page.locator(`div.contacts-adv-search i.fa-search`).click();
      await page.waitForLoadState("domcontentloaded");
    }
  }
}

export async function performanceCleanUpCRMLead(page, identifer, options = {}) {
  // Navigate to CRM page
  //await page.locator(`#crm`).click();
  await page.locator(`#crm [href="/CRM/Leads.aspx"]`).click({timeout: 240000});
  await page.waitForLoadState("domcontentloaded");

  if (options.junk) {
    await page.locator(`#BodyPlaceholder_LeadsUC_btnJunk`).click();
  } else if (options.lost) {
    await page.locator(`#BodyPlaceholder_LeadsUC_btnRejectedLost`).click();
  } else if (options.referred) {
    await page.locator(`#BodyPlaceholder_LeadsUC_btnReferred`).click();
  } else if (options.retained) {
    await page.locator(`#BodyPlaceholder_LeadsUC_btnRetained`).click();
  } else {
    await page.locator(`#BodyPlaceholder_LeadsUC_allActiveCount`).click();
  }

  if (
    await performanceIsVisible(
      page,
      `.rgMasterTable tbody tr:has-text("${identifer}")`,
      5000,
    )
  ) {
    let previousCount = 0;
    let currentCount = await page
      .locator(`.rgMasterTable tbody tr:has-text("${identifer}")`)
      .count(); // Initialize currentCount before loop

    while (currentCount > 0) {
      // Break if no more leads or deletion didn't progress
      if (currentCount === 0 || currentCount === previousCount) break;

      previousCount = currentCount;

      let testRow = page
        .locator(`.rgMasterTable tbody tr:has-text("${identifer}")`)
        .first();
      await page.waitForTimeout(2000);

      // Click meatball menu
      await testRow.locator(`.lead-actions`).click();

      // Click delete lead
      await page.once("dialog", async (dialog) => await dialog.accept());
      await testRow.locator(`.fa-trash`).click();

      // Successful toast message
      await expect(
        page.locator(`.toast-success:has-text("Lead deleted successfully!")`),
      ).toBeVisible();
      await page
        .locator('.toast-success:has-text("Lead deleted successfully!")')
        .click();
      await expect(
        page.locator(`.toast-success:has-text("Lead deleted successfully!")`),
      ).not.toBeVisible({ timeout: 10000 });

      // Update currentCount after deleting
      currentCount = await page
        .locator(`.rgMasterTable tbody tr:has-text("${identifer}")`)
        .count();
    }
  }

  // Click back into all active
  try {
    await page.locator(`#BodyPlaceholder_LeadsUC_allActiveCount`).click();
  } catch (e) {
    console.error(e);
  }
}

export async function performanceAddNewPersonLead(page, lead, navigate = false) {
  const { faker } = npmImports;
  // go to CRM Page
  if (navigate) {
    //await page.locator(`#crm`).click();
    await page.locator(`#crm [href="/CRM/Leads.aspx"]`).click({timeout: 240000});
    await page.waitForLoadState("domcontentloaded");
  }

  // if no ___ is added to lead
  if (!lead.fName) lead.fName = "CRM New Lead";
  if (!lead.lName) lead.lName = faker.name.lastName();

  // Click + from top right
  await page.locator(`[onclick="openNewLeadModal()"]`).click();

  // Fill out New Person Lead
  const modal = page.locator(`[aria-describedby="new-lead-modal"]`);

  // -- Comments
  if (lead.comments) {
    await modal
      .locator(`label:has-text("Comments") + textarea`)
      .fill(lead.comments);
  }

  // -- Client Goals
  if (lead.clientGoal) {
    await modal
      .locator(`label:has-text("Client Goals") + textarea`)
      .fill(lead.clientGoal);
  }

  // -- First Name
  await modal
    .locator(`label:has-text("First Name") + div input`)
    .fill(lead.fName);

  // -- Last Name
  await modal
    .locator(`label:has-text("Last Name") + div input`)
    .fill(lead.lName);

  // -- Email
  if (lead.email) {
    await modal
      .locator(`label:has-text("Email Address") + input`)
      .fill(lead.email);
  }

  // -- Phone
  if (lead.phone) {
    await modal
      .locator(`label:has-text("Primary Phone Number") + input`)
      .fill(lead.phone);
  }

  // -- Company Name
  if (lead.companyName) {
    await modal
      .locator(`label:has-text("Company Name") + input`)
      .fill(lead.companyName);
  }

  // -- Contact Method
  if (lead.contactMethod) {
    await modal
      .locator(
        `label:has-text("Preferred Contact Method") + .select2-container`,
      )
      .click();
    await page.getByRole("option", { name: lead.contactMethod }).click();
  }

  // -- Status
  if (lead.status) {
    await modal
      .locator(`label:has-text("Status") + .select2-container`)
      .click();
    await page.getByRole("option", { name: lead.status, exact: true }).click();
  }

  // -- Conflict Cleared
  if (lead.conflict) {
    await modal
      .locator(`label:has-text("Conflict Cleared") + select`)
      .selectOption("1");
  }

  // -- Main Practice Area
  if (lead.practiceArea) {
    await modal
      .locator(
        `label:has-text("Main Practice Area") + .addMainPractice .select2-container`,
      )
      .click();
    await page.getByRole("option", { name: lead.practiceArea }).click();
  }

  // -- Lead Owner
  if (lead.lead) {
    await modal
      .locator(`label:has-text("Lead Owner") + .select2-container`)
      .click();
    // await page.getByRole("option", {name: lead.lead}).click()
    await page.locator(`[role="option"]:text-is("${lead.lead}")`).click();
  }

  // -- Probability
  if (lead.probability) {
    await modal.locator(`#probability`).fill(lead.probability);
  }

  // -- Potential Value
  if (lead.value) {
    await modal
      .locator(`label:has-text("Potential Value") + input`)
      .fill(lead.value);
  }

  // -- Probability of Retaining Firm
  if (lead.retainingFirm) {
    await modal
      .locator(`label:has-text("Probability of Retaining Firm") + span + input`)
      .fill(lead.retainingFirm);
  }

  // -- Primary Source
  if (lead.primarySource) {
    await modal
      .locator(`label:has-text("Primary Source") + span button`)
      .click();
    for (let source of lead.primarySource) {
      await modal
        .locator(
          `.multiselect-container li:has(:text("${source}")) [type="checkbox"]`,
        )
        .check();
    }
    await modal
      .locator(`label:has-text("Primary Source") + span button`)
      .click();
  }

  // -- Referral source
  if (lead.referralSource) {
    await modal
      .locator(`label:has-text("Referral source") + div .select2-container`)
      .click();
    await page.keyboard.type(lead.referralSource);
    await page.getByRole("option", { name: lead.referralSource }).click();
  }

  // -- Secondary Source
  if (lead.secondarySource) {
    await modal
      .locator(`label:has-text("Secondary Source") + textarea`)
      .fill(lead.secondarySource);
  }

  // -- Billing type
  if (lead.billingType) {
    await modal
      .locator(`label:has-text("Billing Type") + div .select2-container`)
      .click();
    await page.getByRole("option", { name: lead.billingType }).click();
  }

  // -- Hourly Rate
  if (lead.hourlyRate) {
    await modal
      .locator(`label:has-text("Hourly Rate") + .new-matter-currency`)
      .first()
      .fill(lead.hourlyRate);
  }

  // -- Fee Details
  if (lead.feeDetails) {
    await modal
      .locator(`label:has-text("Fee Details") + textarea`)
      .fill(lead.feeDetails);
  }

  // -- Admin Fee
  if (lead.adminFee) {
    await modal
      .locator(`label:has-text("Default Administrative Fee") + input`)
      .fill(lead.adminFee);
  }

  // -- Admin Fee Description
  if (lead.adminFeeDescription) {
    await modal
      .locator(
        `label:has-text("Default Administrative Fee Description") + div input`,
      )
      .fill(lead.adminFeeDescription);
  }

  // Create Lead
  await page.locator(`[data-bind="click: getOrSaveContact"]`).click();

  // Successful toast message
  await expect(
    page.locator(`.toast-success:has-text("Lead successfully saved.")`),
  ).toBeVisible();
  await page
    .locator(`.toast-success:has-text("Lead successfully saved.")`)
    .click();
  await expect(
    page.locator(`.toast-success:has-text("Lead successfully saved.")`),
  ).not.toBeVisible();

  return lead;
}

export function performanceCrmEventFormattedDate(daysAhead, hours, minutes) {
  const { dateFns } = npmImports;
  // Helper function - To format the start and end date for new event input form
  let date = dateFns.addDays(new Date(), daysAhead);
  date = dateFns.setHours(date, hours);
  date = dateFns.setMinutes(date, minutes);
  return dateFns.format(date, "M/d/yyyy h:mm a");
}

export function performanceCrmEventFormattedDashboardDate(startDateString, endDateString) {
  const { dateFns } = npmImports;
  // Helper function - To format the start and end date into the format displayed on the calendar dashboard

  const inputFormat = "M/d/yyyy h:mm a";

  // Convert string dates to Date objects
  const startDate = dateFns.parse(startDateString, inputFormat, new Date());
  const endDate = dateFns.parse(endDateString, inputFormat, new Date());

  // Format for the date and time
  const dateFormatWithYear = "MMM d yyyy";
  const dateFormat = "MMM d";
  const timeFormat = "h:mm a";

  // Check if both dates are on the same day
  if (
    dateFns.format(startDate, dateFormat) ===
    dateFns.format(endDate, dateFormat)
  ) {
    // If the dates are the same, only display the date once
    return `${dateFns.format(
      startDate,
      `${dateFormatWithYear} ${timeFormat}`,
    )} - ${dateFns.format(endDate, timeFormat)}`;
  } else {
    // If the dates are different, display the date for both start and end times
    return `${dateFns.format(
      startDate,
      `${dateFormat} ${timeFormat}`,
    )} - ${dateFns.format(endDate, `${dateFormat} ${timeFormat}`)}`;
  }
}

export async function performanceCrmEventCleanup(page, identifier) {
  // Function assumes we're already in the CRM tab -> clicked into the lead -> and clicked into "Events" tab
  if (
    await performanceIsVisible(page, `#calendar-grid tr:has-text("${identifier}")`, 5000)
  ) {
    // Clean up all instances of the event
    while (
      await page.locator(`#calendar-grid tr:has-text("${identifier}")`).count()
    ) {
      // Click "Delete"
      const eventRow = page
        .locator(`#calendar-grid tr:has-text("${identifier}")`)
        .first();
      // Click on the 3 dots to the right of the event
      await eventRow.locator(`div.acDelete`).click();

      // Click "Delete Event"
      await eventRow
        .locator(`[data-bind="click: $parent.deleteEvent"]`)
        .first()
        .click();

      // Click the "Delete" button in the "Delete Event" modal
      await page
        .locator(`.event-delete-dialog button:has-text("Delete")`)
        .first()
        .click();

      // Successful toast message
      await expect(
        page.locator(
          `.toast-success:has-text("Event has been successfully deleted")`,
        ),
      ).toBeVisible();
      await expect(
        page.locator(
          `.toast-success:has-text("Event has been successfully deleted")`,
        ),
      ).not.toBeVisible();
    }
  }
}

export async function performanceCreateCRMCalendarEvent(page, newEvent = {}) {
  // Click the plus button to create a new event
  await page.locator("#matter-detail-calendar").locator(`a.add-btn`).click();
  // Save the modal locator
  const eventModal = page.locator(`div[aria-describedby="event-entry-modal"]`);

  // Fill out the subject
  await eventModal.locator(`.event-entry-subject`).fill(newEvent.subject);

  // Fill out the location
  if (newEvent.location) {
    await eventModal
      .locator(`#event-entry-location-input`)
      .fill(newEvent.location);
  }
  // Fill out the FROM date
  if (newEvent.dateStart) {
    await eventModal.locator(`#event-entry-kdtp-from`).fill(newEvent.dateStart);
  }
  // Select a category
  await eventModal.locator(`#s2id_event-entry-category-select`).click();
  await page.locator(`ul.select2-results li:has-text("Meeting")`).click();

  if (newEvent.dateEnd) {
    // Fill out the TO date
    await eventModal.locator(`#event-entry-kdtp-to`).fill(newEvent.dateEnd);
  }

  if (newEvent.description) {
    // Fill out the description
    await eventModal
      .locator(`#calendar-event-description`)
      .fill(newEvent.description);
  }

  // -- Event Owner and attendee
  if (newEvent.owner || newEvent.attendee) {
    await page
      .locator(
        `[aria-describedby="event-entry-modal"] label:has-text("Event Owner") + div`,
      )
      .click();
    await page.getByRole("option", { name: newEvent.owner }).click();

    await page.locator(`[id*=addAttendeeUserSelect]`).first().click();
    await page.getByRole("option", { name: newEvent.attendee }).click();
  }
  // Click the "Save" button
  await eventModal
    .locator(`#event-entry-save-button`)
    .click({ timeout: 50_000 });

  // If there is a calendar conflict, accept the conflict
  if (
    await page
      .locator(
        `[aria-describedby="event-date-conflict-modal"]:has-text("Event Conflict")`,
      )
      .isVisible()
  ) {
    await page.locator(`#event-date-conflict-modal-ok`).click();
  }
}

export async function performanceAddDocumentToALead(page, fileName) {
  // click into Document tab
  await page.locator(`.rtsLink:has-text("Document")`).click();

  // drag and drop img
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 4));
  await dragAndDropElement(
    page,
    `.documents-list .document-list-empty-message img`,
    `.documents-list .document-list-empty-message`,
  );
  page.once("filechooser", async (chooser) => {
    await setFilesWithLogging(chooser, `/home/wolf/files/${fileName}`, "Lead Document");
  });
  await page.locator(`#DocumentUploadDropzone`).click();
  await page
    .locator(
      `#upload-documents-modal [data-bind*="click: uploadBulkDocuments"]`,
    )
    .click();

  // successful toast message
  await expect(
    page.locator(`.toast-success:has-text("Files uploaded successfully.")`),
  ).toBeVisible();
  await expect(
    page.locator(`.toast-success:has-text("Files uploaded successfully.")`),
  ).not.toBeVisible();

  // file should appear in table
  await page
    .locator(`#upload-documents-modal a:has-text("Complete Upload")`)
    .click();
  await expect(
    page.locator(
      `#document-list-grid tr:has-text("${fileName.split(".")[0]}"):visible`,
    ),
  ).toBeVisible();
  const docRow = page.locator(
    `#document-list-grid tr:has-text("${fileName.split(".")[0]}"):visible`,
  );

  return docRow;
}

export async function performanceAddCompanyContactFromContactPage(page, company) {
  // Click + from top right nav
  await page
    .locator(`.widget-header:has(.title:has-text("Contacts")) .plus-icon`)
    .click();

  // click new company
  await page
    .locator(`.new-contacts-dropdown li:has-text("New Company")`)
    .click();

  // Fill out company name
  const modal = page.locator(`[aria-describedby="contact-company-modal"]`);
  await modal.locator(`#company-name`).fill(company.name);

  // Fill out email
  await modal.locator(`input#company-emailAddress`).fill(company.email);
  await modal.locator(`input#company-primary-emailAddress`).check();

  // Click save
  await modal.locator(`a:has-text("Save"):visible`).click();
  // Define the locator for the "Create Anyway" button
  const createAnywayButton = page.getByText(`Create Anyway`).nth(1);
  // Check if the button is visible
  if (await createAnywayButton.isVisible()) {
    // Click the button if it's visible
    await createAnywayButton.click();
  }

  // successful company toast message
  await expect(
    page.locator(`.toast-success:has-text("Company has been saved.")`),
  ).toBeVisible();
  await page
    .locator(`.toast-success:has-text("Company has been saved.")`)
    .click();
  await expect(
    page.locator(`.toast-success:has-text("Company has been saved.")`),
  ).not.toBeVisible();
}

export async function performanceAddPersonContactFromContactPage(page, person) {
  // Click + from top right nav
  await page
    .locator(`.widget-header:has(.title:has-text("Contacts")) .plus-icon`)
    .click();

  // click new Person
  await page
    .locator(`.new-contacts-dropdown li:has-text("New Person")`)
    .click();

  // Fill out Person modal
  const modal = page.locator(`[aria-describedby="contact-person-modal"]`);

  // -- First Name
  await modal
    .locator(`label:has-text("First Name") + div input`)
    .fill(person.fName);

  // -- Last Name
  await modal
    .locator(`label:has-text("Last Name") + div input`)
    .fill(person.lName);

  // -- Email
  await modal.locator(`input#person-emailAddress`).fill(person.email);
  await modal.locator(`input#person-primary-emailAddress`).check();

  if (person.phone) {
    // -- Phone Number
    await modal.locator(`label:has-text("Tel No") + input`).fill(person.phone);
    await modal
      .locator(`#person-phone-number-section [type="checkbox"]`)
      .check();
  }

  // Click save
  await modal.locator(`a:has-text("Save"):visible`).click();

  // Define the locator for the "Create Anyway" button
  const createAnywayButton = page
    .locator("a.btn.btn-primary.add-btn.uppercase.save-buttons", {
      hasText: "Create Anyway",
    })
    .first();

  // Check if the button is visible
  if (await createAnywayButton.isVisible()) {
    // Click the button if it's visible
    await createAnywayButton.click();
  }

  // successful Person toast message
  await expect(
    page.locator(`.toast-success:has-text("Person has been saved.")`),
  ).toBeVisible();
  await page
    .locator(`.toast-success:has-text("Person has been saved.")`)
    .click();
  await expect(
    page.locator(`.toast-success:has-text("Person has been saved.")`),
  ).not.toBeVisible();

  await page.locator(`#page-search`).fill(person.fName);
  await page.keyboard.press("Enter");

  await expect(
    page.locator(`#contactList li:has-text("${person.fName} ${person.lName}")`),
  ).toBeVisible();
  const personCard = page.locator(
    `#contactList li:has-text("${person.fName} ${person.lName}")`,
  );

  return personCard;
}

/**
 * Deletes default folders
 * @param page - any page
 * @param {String} folderType - Either "Documents" or "Notes"
 * @param {String} practiceArea - Name of the practice area
 * @param {Array} folderNames - An array of folder names to be deleted
 */

export async function performanceCleanupDefaultFolders(
  page,
  folderType,
  practiceArea,
  folderNames,
  matter,
) {
  // Data validation
  if (folderType !== "Documents" && folderType !== "Notes") {
    throw new Error("🟡 folderType must be either 'Documents' or 'Notes'");
  }

  // Setup folder text selector
  const folderSelection =
    folderType === "Documents"
      ? "Default Folders for Documents..."
      : "Default Folders for Notes…";

  // Click the user icon in the top right
  await page.locator(`#imgUserPic`).click();

  // Click firm settings
  await page.locator(`li:has-text("Firm Settings")`).click();

  // Click on documents & notes
  await page.locator(`a:text-is("Documents & Notes")`).click();

  // Click default folders
  await page.locator(`a:text-is("Default Folders")`).click();

  // Setup iframe
  const frame = await (
    await page.waitForSelector(`iframe#ifrmDefaultFolders`)
  ).contentFrame();

  // Click the default notes folder for the practice area that matches the matter
  await frame
    .locator(
      `tr:has-text("${practiceArea}") >> a:text-is("${folderSelection}")`,
    )
    .click();

  // Click to expand the root folder
  await frame
    .locator(`li#folder-root:has-text("Root") >> i.jstree-ocl`)
    .click();

  // Delete the previously made folders
  for (const folderName of folderNames) {
    // Right click the folder
    await frame
      .locator(`a:has-text("${folderName}")`)
      .first()
      .click({ button: "right" });

    // Click delete
    await frame.locator(`li:has-text("Delete")`).click();
  }

  // Drag and drop the modal into view
  await frame.locator(`span:text-is("${matter.practiceArea}")`).hover();
  await page.waitForTimeout(500);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.move(600, 200);
  await page.waitForTimeout(500);
  await page.mouse.up();

  // Click save
  await frame.locator(`a.btn-primary:text-is("Save")`).click();
}

export async function performanceCreateTimeEntry(page, entry) {
  const { faker } = npmImports;
  if (!entry.matter) entry.matter = "Business Development";
  if (!entry.duration) entry.duration = "30m";
  if (!entry.workType) entry.workType = "Consultation";
  if (!entry.narrative) entry.narrative = faker.random.word();
  if (!entry.rate) entry.rate = "5.00";

  // Click + icon
  await page.locator(`#add-new-time-entry.add-btn`).click();

  // Select Matter
  await page.locator(`label:has-text("Matter") + div a:visible`).click();
  await page.waitForTimeout(2000);
  await page.keyboard.type(entry.matter);
  await page.locator(`li:has-text("${entry.matter}")`).click();

  // Fill Duration
  await page.locator(`#te_durationVal`).fill(entry.duration);

  // Select Work Type
  await page.locator(`label:has-text("Work Type") + div a:visible`).click();
  await page.locator(`li:has-text("${entry.workType}"):visible`).click();

  // Fill Narrative
  await page
    .getByRole('textbox', { name: 'NARRATIVE' })
    .fill(entry.narrative);
  // Timekeeper
  if (entry.timeKeeper) {
    await page
      .locator(`label:has-text('Time Keeper') + .select2-container`)
      .click();
    await page.keyboard.type(entry.timeKeeper);
    await page.getByRole("option", { name: entry.timeKeeper }).click();
  }
  // Fill Rate
  await page.locator(`#te_rate`).fill(entry.rate);

  // Click Save & Close
  await page.locator(`#btnSaveClose`).click();
}

export async function performanceCleanupTimeEntry(page) {
  // Click 'Time' on the left in the quick access
  await page.locator(`#time a`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(5000);

  // Show 100 records
  await page
    .locator(
      '.k-label:has-text("items per page"):visible >> [aria-label="select"]',
    )
    .scrollIntoViewIfNeeded();
  await page
    .locator(
      '.k-label:has-text("items per page"):visible >> [aria-label="select"]',
    )
    .click();
  await page.locator(`[role="option"]:has-text("100"):visible`).click();
  await page.waitForTimeout(5000);

  // Cleanup
  const cleanupNum = await page.locator(`.fa-trash:visible`).count();
  let i = 0;
  while (i < cleanupNum) {
    await page.locator(`.fa-trash:visible >> nth=0`).click();
    await page.waitForTimeout(5000);
    await page.getByRole("link", { name: "Refresh" }).click();
    await page.waitForTimeout(5000);
    i++;
  }
}

export async function performanceCleanUpRetainerRequest(page, indentifer) {
  await page.locator(`#accounting a`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.locator(`#BodyPlaceholder_retainerRequests`).click();

  if (
    await performanceIsVisible(
      page,
      `[role="rowgroup"] tr:has-text("${indentifer}")`,
      3000,
    )
  ) {
    while (
      (await page
        .locator(`[role="rowgroup"] tr:has-text("${indentifer}")`)
        .count()) > 0
    ) {
      let row = page
        .locator(`[role="rowgroup"] tr:has-text("${indentifer}")`)
        .first();
      await row.locator(`.retainer-requests-action-button`).click();
      await page
        .locator(`[onclick="openDeleteRetainerRequestConfirmModal()"]:visible`)
        .click();
      await page.locator(`.retainer-request-delete-button`).click();
      await page.waitForTimeout(2000);
    }
  }
}

// navs to specific path if not there
// i.e Settings/Settings -> for settings or Matters/MatterList2 for matters
export async function performanceNavToIfNotIn(pathname, customPage, postPath = "") {
  const URL = process.env.DEFAULT_URL;
  console.log(URL);
  if (customPage.url() !== `${URL}/${pathname}.aspx${postPath}`) {
    await customPage.goto(`${URL}/${pathname}.aspx${postPath}`);
  }
}

export async function performanceCleanUpServiceFeeByName(page, serviceName) {
  await navToIfNotIn("settings/settings", page);
  await page.locator(`li :text('billing & accounting')`).click();
  await page
    .locator(`#billingDrop [href="#FlatFeeServiceDescriptions"]`)
    .click();
  let frame = await (
    await page.waitForSelector("#ifrmServices")
  ).contentFrame();
  while ((await frame.locator(`tr:has-text('${serviceName}')`).count()) > 0) {
    let loc = frame.locator(`tr:has-text('${serviceName}')`).first();
    page.once("dialog", async (dialog) => await dialog.accept());
    await loc.locator(`[title="Delete"]`).click();
    await page.waitForTimeout(2000);
  }
}

/**
 * Creates a Retainer Request in a Matter
 * @param {Object} page - page argument
 * @param {Object} retainer - object of depositTo and amount
 */
export async function performanceAddRRtoAMatter(page, retainerRequest) {
  const { faker } = npmImports;
  if (!retainerRequest.depositTo) {
    console.warn(
      `🟡 No deposit name was added, defaulted to Operating Account 🟡`,
    );
    retainerRequest.depositTo = "Operating Account";
  }

  if (!retainerRequest.amount) {
    let amount = faker.datatype
      .number({ min: 10, max: 99, precision: 0.01 })
      .toFixed(2)
      .toString();
    console.warn(`🟡 No amount was added, defaulted to ${amount} 🟡`);
    retainerRequest.amount = amount;
  }

  // add a retainer request
  await page.locator(`.rtsLI:has-text("Retainer Request")`).click();

  // click the + in nav
  await page.locator(`.retainer-request-create-new-icon`).click();

  // fill out form
  const modal = page.locator(`[aria-describedby="retainer-request-modal"]`);
  await modal
    .locator(`label:has-text("Deposit to") + div .select2-container`)
    .click();
  await page.getByRole("option", { name: retainerRequest.depositTo }).click();
  await modal
    .locator(`[data-bind^="value: amount"]`)
    .fill(retainerRequest.amount);
  await modal
    .locator(`[data-bind="visible: isNew(), click: createRetainerRequest"]`)
    .click();

  // wait for toast message
  await expect(
    page.locator(`.toast-success:has-text("Retainer request created")`),
  ).toBeVisible();
  await page
    .locator(`.toast-success:has-text("Retainer request created")`)
    .click();
  await expect(
    page.locator(`.toast-success:has-text("Retainer request created")`),
  ).not.toBeVisible();

  // grab RR no
  const retainerRequestNo = await page
    .locator(
      `#retainer-requests-grid tbody tr:has-text("${retainerRequest.amount}") .retainer-requests-item-link`,
    )
    .innerText();

  return {
    retainerRequest,
    retainerRequestNo,
  };
}

export async function performanceCleanUpTextMessagesFromTextPage(page, matterName) {
  // refresh sometimes needed
  await page.locator(`.zola-icon-refresh:visible`).click();

  if (
    await performanceIsVisible(
      page,
      `#ConvList .list-group-item:has-text("${matterName}")`,
      3000,
    )
  ) {
    while (
      await performanceIsVisible(
        page,
        `#ConvList .list-group-item:has-text("${matterName}")`,
        1000,
      )
    ) {
      // grab first card with matter name
      let textCard = page
        .locator(`#ConvList .list-group-item:has-text("${matterName}")`)
        .first();

      // click delete icon
      await textCard.locator(`.zola-icon-trash`).click();

      // click delete
      await page.getByRole("button", { name: "DELETE" }).click();
      await page.waitForTimeout(2000);
      await page.locator(`.zola-icon-refresh:visible`).click();
    }
  }
}

/*
  isVisible() is used to create if else statements rather than using try catches
  like .isVisible() but allows a timeout before it returns
  arguments:
    - Page: any page
    - Selector: Any selector you want to see 
      * Uses first instance of selector
      * must be of string type
    - Timeout : how long you expect this selector to take to be seen
      * default 30 seconds
    - Override: Default is to take first instance of selector (nth = 0) but can be overriden if needed
      to validate there should only be one
*/

export async function performanceIsVisible(page, selector, timeout, override = false) {
  timeout ? timeout : 30 * 1000;

  try {
    // if override - will check if multiple instance, else will use first instance
    override
      ? await expect(page.locator(selector)).toBeVisible({ timeout })
      : await expect(page.locator(selector).nth(0)).toBeVisible({ timeout });

    console.warn(`🟢 Selector: ${selector} has been found 🟢`);

    return true;
  } catch {
    console.warn(
      `🟡 Selector: ${selector} has not been found - if unexpected, try increasing timeout 🟡`,
    );
    return false;
  }
}

export async function performanceGetBoundingBox(page, selector) {
  const handle = await page.waitForSelector(selector);
  const box = await handle.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export async function performanceDragAndDropElement(
  page,
  dragSelector,
  dropSelector,
  { steps } = { steps: 10 },
) {
  // await page.click(dragSelector);

  const drag = await getBoundingBox(page, dragSelector);
  const drop = await getBoundingBox(page, dropSelector);

  // drag element
  await page.mouse.move(drag.x, drag.y, { steps });
  await page.mouse.down();

  // drop element
  await page.mouse.move(drop.x, drop.y, { steps });
  await page.waitForTimeout(1000);
  await page.mouse.up();
}

export async function performanceAddWFtoMatter(page, matter, flowName) {
  // Naviagte back to the matter
  await goToMatter(page, matter.name);

  // Navigate to workflows from within the matter
  await page.locator(`.workflows-tab a`).click();

  // Wait for the empty list
  await page.locator(`#empty-list`).waitFor();

  // Add the workflow to the matter
  // Click the + icon
  await page.locator(`#wf-practiceArea`).click();

  // Click on the play icon for the workflow template
  await page
    .locator(
      `[class="wf-whole-wrapper cf"]:has-text('${flowName}') [class="pull-right wf-play-width"] [title="Start here"]`,
    )
    .click();

  // Wait for the modal
  await page.locator(`#workflow-wizard-modal`).waitFor();

  // Click the save button
  await page.locator(`#workflow-wizard-modal .save-buttons`).click();

  // Wait for the modal to no longer be visible
  await page.locator(`#workflow-wizard-modal`).waitFor({ state: "hidden" });

  // Wait for the toast
  await page.locator(`#toast-container`).waitFor();
}

export async function performanceCreateWorkflowTemp(page, prefix, options = {}) {
  const { faker } = npmImports;
  const flowName = options.flowName || `${prefix} Flow`;
  const taskName = options.taskName || `${prefix} Task`;
  const eventName = options.eventName || `${prefix} Event`;
  const practiceArea = options.practiceArea || `Personal Injury`;
  const lorem1 = faker.lorem.words(6);
  const lorem2 = faker.lorem.words(6);
  const lorem3 = faker.lorem.words(6);

  // navigate to workflow templates
  await page.locator(`#avatar-dropdown-toggle`).click();
  await page.waitForLoadState(`domcontentloaded`);
  await page.locator(`:text("Firm Settings")`).click();
  await page.waitForLoadState(`domcontentloaded`);

  // navigate to Events & Calendar Rules > Workflow Templates
  await page.locator(`li:has-text("Events & Calendar Rules")`).click();
  await page.waitForLoadState(`domcontentloaded`);
  await page.locator(`li a:text-is("Workflow Templates")`).click();
  await page.waitForLoadState(`domcontentloaded`);

  // declare firmSettingsFrame
  const firmSettingsFrame = page.frameLocator(`.iframeWrapper:visible iframe`);

  // wait for the page to be loaded before moving on
  await expect(
    firmSettingsFrame.locator(`h3:text-is("Personal Injury")`),
  ).toBeVisible();

  // open workflow template creation form
  await firmSettingsFrame.locator(`a.add-btn`).click();
  await expect(page.locator(`#loading-overlay`)).toBeVisible();
  await expect(page.locator(`#loading-overlay`)).not.toBeVisible();

  // Wait for the workflow name input
  await page.getByPlaceholder("Enter a Workflow Template name").waitFor();

  // Fill the workflow name input with nothing.
  await page.getByPlaceholder("Enter a Workflow Template name").fill(flowName);

  // Un-focus the input
  await page.getByPlaceholder("Enter a Workflow Template name").blur();

  // set workflow practice area
  await page.locator(`.workflow-practice-area`).click();
  await page.locator(`[role="option"]:has-text("${practiceArea}")`).click();

  // set workflow description
  await page
    .locator(
      `[placeholder*="Please provide a brief description of the workflow"]`,
    )
    .fill(lorem1);

  // add workflow task step
  const workflowStepFrame = page.frameLocator(`#canvas`);
  await workflowStepFrame.locator(`.add-steps-button button`).click();
  await workflowStepFrame
    .locator(`span:text-is("Add a Workflow Event")`)
    .click();
  await page.locator(`#new-wflw-event-subject`).fill(eventName);
  await page.locator(`#new-wflw-task-description`).fill(lorem3);
  await page
    .locator(`.ui-dialog .btn-primary:has-text("Save"):visible`)
    .click();

  // add workflow event step
  await workflowStepFrame.locator(`.plus-sign-node >> nth=0 >> button`).click();
  await workflowStepFrame
    .locator(`span:text-is("Add a Workflow Task")`)
    .click();
  await page.locator(`#new-wflw-task-subject`).fill(taskName);
  await page.locator(`#new-wflw-task-description`).fill(lorem2);
  await page
    .locator(`.ui-dialog .btn-primary:has-text("Save"):visible`)
    .click();

  // Click the save button
  await page.locator(`#workflow-canvas-holder .btn-primary`).click();

  return {
    flowName,
    taskName,
    eventName,
    practiceArea,
    lorem1,
    lorem2,
    lorem3,
    firmSettingsFrame,
    workflowStepFrame,
  };
}

export async function performanceCleanUpWorkCategory(page, categoryType) {
  await navToIfNotIn("settings/settings", page, "#TimeEntryCategories");
  const frame = await (
    await page.waitForSelector("#ifrmWorkCategories")
  ).contentFrame();
  while ((await frame.locator(`span[title^='${categoryType}']`).count()) > 0) {
    page.once("dialog", async (dialog) => await dialog.accept());
    await page.waitForTimeout(1000);
    await frame
      .locator(`tr`, { has: frame.locator(`span[title^='${categoryType}']`) })
      .locator(`input[title="Delete"]`)
      .click();
    await page.waitForTimeout(2000);
  }
}

/**
 * Deletes nodes from Workflow template
 * @param page - any page
 * @param {String} nodeName - any
 */

export async function performanceCleanupWorkflowNode(page, nodeName) {
  // grab canvas iframe
  const workflowFrame = await (
    await page.waitForSelector(`#canvas`)
  ).contentFrame();

  // check if there is a node with that name
  if (
    await performanceIsVisible(
      workflowFrame,
      `.activity-node:has-text("${nodeName}")`,
      4000,
    )
  ) {
    let node = workflowFrame.locator(`.activity-node:has-text("${nodeName}")`);
    let firstNode = workflowFrame.locator(`.activity-node`).first();
    if (
      await firstNode
        .locator(`.activity-node-label:has-text("${nodeName}")`)
        .isVisible()
    ) {
      throw new Error(` 🔴 Cannot delete First Node 🔴`);
    }

    // check if node is anchor
    if (
      await node
        .locator(
          `.activity-node-trashcan-and-anchor-tile svg:not(.activity-node-trashcan-icon)`,
        )
        .isVisible()
    ) {
      // grab first node and set to anchor
      await firstNode.locator(`.activity-node-pencil-icon`).click();
      await page.once("dialog", async (dialog) => await dialog.accept());
      await page
        .getByRole("dialog")
        .locator(`a:has-text("Set as Anchor")`)
        .click();
      await page
        .locator(
          `[data-bind="click: formVm.save, enable: formVm.savingEnabled"]`,
        )
        .click();

      await node.hover();
      await node.locator(`.activity-node-trashcan-icon`).click();
      await workflowFrame
        .locator(`.message-box-button:has-text("yes")`)
        .click();
      await node.waitFor({
        state: "detached",
      });
      await page
        .locator(`div [data-bind="click: submitWorkflowTemplate"]`)
        .click();
      await page
        .locator(`.toast-success:has-text("Workflow saved successfully!")`)
        .waitFor();
      await page
        .locator(`.toast-success:has-text("Workflow saved successfully!")`)
        .waitFor({ state: "detached" });
    } else {
      await node.hover();
      await node.locator(`.activity-node-trashcan-icon`).click();
      await workflowFrame
        .locator(`.message-box-button:has-text("yes")`)
        .click();
      await node.waitFor({
        state: "detached",
      });
      await page
        .locator(`div [data-bind="click: submitWorkflowTemplate"]`)
        .click();
      await page
        .locator(`.toast-success:has-text("Workflow saved successfully!")`)
        .waitFor();
      await page
        .locator(`.toast-success:has-text("Workflow saved successfully!")`)
        .waitFor({ state: "detached" });
    }
  }
}

/**
 * add node to Workflow template
 * @param page - any page
 * @param {Object} options:
 *  @param {String} - type: either Task or Event
 *  @param {String/Number} - location: either first or last/ can be added between nodes
 *  @param {String} - nodeName: any
 */

export async function performanceAddNode(page, options = {}) {
  if (!options.type) options.type = "Task";
  if (!options.location) options.location = "last";
  if (!options.nodeName) options.nodeName = "New Node";

  // grab new
  const workflowFrame = await (
    await page.waitForSelector(`#canvas`)
  ).contentFrame();

  // add new node
  if (options.location == "last") {
    let count = await workflowFrame.locator(`.activity-node`).count();
    await workflowFrame
      .getByRole("button", { name: "+" })
      .nth(count - 1)
      .click();
  } else if (options.location == "first") {
    await workflowFrame.getByRole("button", { name: "+" }).last().click();
  } else {
    await workflowFrame
      .getByRole("button", { name: "+" })
      .nth(options.location - 1)
      .click();
  }

  // add new task
  await workflowFrame
    .locator(
      `.plus-sign-menu-item:has-text("Add a Workflow ${options.type}"):visible`,
    )
    .click();

  // change task subject
  await page
    .locator(`#new-wflw-${options.type.toLowerCase()}-subject`)
    .fill(options.nodeName);

  // click save
  await page
    .locator(`[data-bind="click: formVm.save, enable: formVm.savingEnabled"]`)
    .click();

  // make sure new node is visible
  await workflowFrame
    .locator(`.activity-node:has-text("${options.nodeName}")`)
    .waitFor();
  const node = workflowFrame.locator(
    `.activity-node:has-text("${options.nodeName}")`,
  );

  return node;
}
/**
 * Deletes default calendar rules of a certain type
 * @param page - any page
 * @param {String} reminderType - Either "SMS", "Email", or "Popup"
 */

export async function performanceCleanupDefaultReminders(page, reminderType) {
  // Data validation
  if (
    reminderType !== "SMS" &&
    reminderType !== "Email" &&
    reminderType !== "Popup"
  ) {
    throw new Error(
      `🟡 reminderType must be either "SMS", "Email", or "Popup"`,
    );
  }

  // Click the user icon in the top right
  await page.locator(`#imgUserPic`).click();

  // Click firm settings
  await page.locator(`li:has-text("Firm Settings")`).click();

  // Click on events & calendar rules
  await page.locator(`a:text-is("Events & Calendar Rules")`).click();

  // Click on calendar rules
  await page.locator(`a:text-is("Calendar Rules")`).click();

  // Setup iframe
  const frame = await (
    await page.waitForSelector(`iframe#ifrmCalendarRules`)
  ).contentFrame();

  // Cleanup all previous pop-up calendar rules
  const ruleCount = await frame
    .locator(`div.calendar-rule-entry-reminder`)
    .filter({
      has: frame.locator(`span.select2-chosen:text-is("${reminderType}")`),
    })
    .count();
  const ruleLocator = frame.locator(`div.calendar-rule-entry-reminder`).filter({
    has: frame.locator(`span.select2-chosen:text-is("${reminderType}")`),
  });
  for (let i = ruleCount - 1; i >= 0; i--) {
    const rule = ruleLocator.nth(i);
    // Click the delete icon
    await rule.locator(`a.calendar-rule-entry-reminder-remove`).click();
  }

  // Click save
  await frame.locator(`div#save-reminders-button`).click();
}

export async function performanceReportCleanupFailed({ dedupKey, errorMsg } = {}) {
  const payload = {
    runId: process.env.QAWOLF_RUN_ID,
    teamId: process.env.QAWOLF_TEAM_ID,
    workflowId: process.env.QAWOLF_WORKFLOW_ID,
    suiteId: process.env.QAWOLF_SUITE_ID,
    dedupKey,
    errorMsg,
  };

  // prevents alerts when running in editor (RUN_ID will be undefined)
  if (!payload.runId) return;

  console.log(payload);
  await fetch("https://qawolf-automation.herokuapp.com/apis/cleanup-fail", {
    body: JSON.stringify(payload),
    contentType: "application/json",
    method: "POST",
  });
}
export async function performanceAddNewTaskToALead(page, newTask) {
  // Click task tab
  await page.locator(`.rtsLink:has-text("Tasks")`).click();

  // Click the plus icon in the Tasks section
  await page.locator(`[data-bind="click: $root.newTask"]`).click();

  // Locate the modal and save it to a variable
  const modal = page.locator(`[aria-describedby="newTaskForm"]`);

  // -- Subject
  await modal.locator(`#task-name`).fill(newTask.subject);

  // -- Description
  await modal.locator(`#task-desc`).fill(newTask.description);

  // -- Tag
  await modal.locator(`label:has-text("Tags") + .select2-container`).click();
  await page.keyboard.type(newTask.tag);
  await page.keyboard.press("Enter");

  // -- Due Date
  await modal
    .locator(`#task-due-date-picker`)
    .fill(`${newTask.dueDate} 11:30 PM`);

  // Click "Save & Close"
  await page
    .locator(`[data-bind="visible: !isUpdate(), click: saveTaskEntry"]`)
    .click();
}

export async function performanceCreateMatterIntakeForm(page, intakeForm = {}) {
  // Ensure the intakeForm argument has all the required info, throw error if not
  if (!intakeForm.template) {
    throw new Error(`🛑 Intake form must have a template 🛑`);
  } else if (!intakeForm.name) {
    throw new Error(`🛑 Intake form must have a name 🛑`);
  } else if (!intakeForm.contact) {
    throw new Error(`🛑 Intake form must have a contact 🛑`);
  }

  // Click the "Intake Forms" tab
  await page.locator(`.custom-tab a`).click();

  // Click the plus icon in the section header
  await page.locator(`[data-bind="click: createForm"]`).click();

  // Fill out the form setup with the intake form object
  let modal = page.locator(`[aria-describedby="add-intake-form-custom-modal"]`);

  // -- Practice Area
  await modal
    .locator(`label:has-text("Practice Area") + div .select2-container`)
    .click();
  await page.getByRole("option", { name: "Business Development" }).click();

  // --  Intake form template
  await modal
    .locator(`label:has-text("Intake Form Template") + div .select2-container`)
    .click();
  await page.getByRole("option", { name: intakeForm.template }).click();

  // -- Form Name
  await modal
    .locator(`label:has-text("Form Name") + div input`)
    .fill(intakeForm.name);

  // -- Contact
  await modal
    .locator(`label:has-text("Select Contact") + div .select2-container`)
    .click();
  await page.getByRole("option", { name: intakeForm.contact }).click();

  // -- Share
  if (intakeForm.share) {
    await page.locator(`#checkBoxShareForm`).click();

    await page.locator(`a:text("Display Link")`).click();

    await page
      .locator(`[data-bind="click: closeModal, visible: isModalLocked()"]`)
      .click();
  } else {
    // Click "Fill now"
    await modal.locator(`a:has-text("Fill Now")`).click();

    // Fill out the form inputs with the intake form object
    await page
      .locator(`[data-bind="text: label"]:visible + div input`)
      .first()
      .fill(intakeForm.name);
    await page
      .locator(`[data-bind="text: label"]:visible + div input`)
      .nth(1)
      .fill(intakeForm.name);

    // Click "Save and Close"
    await page
      .locator(`#fill-intake-form-modal .add-btn:has-text("Save and Close")`)
      .click();

    // Assert "New form successfully added" toast notification is visible
    await expect(
      page.locator(`.toast-success:has-text("New form successfully added")`),
    ).toBeVisible();
    await expect(
      page.locator(`.toast-success:has-text("New form successfully added")`),
    ).not.toBeVisible();
  }
}

export async function performanceCleanUpEmailSync(page) {
  // click avatar dropdown
  await page.locator(`#imgUserPic`).click();

  // click my settings
  await page.locator(`li:has-text("My Settings")`).click();

  // locate modal
  const settingsFrame = page.frameLocator(`#userSettingsModal-iframe`);

  // click on email  set up
  await settingsFrame
    .locator(`li#userSettingTab3:has-text("Email Setup")`)
    .click();
  await page.waitForTimeout(1000);

  // locate stop email sync
  const stopEmailSyncLocator = settingsFrame
    .locator(`#user-settings-stop-email-sync`)
    .first();

  // check if the stop email sync locator is visible
  if (await stopEmailSyncLocator.isVisible()) {
    await stopEmailSyncLocator.click();
    await page.waitForTimeout(2000);
    await expect(stopEmailSyncLocator).not.toBeVisible({ timeout: 1000 });
    const saveButton = settingsFrame
      .locator("#user-settings-main-modal")
      .getByText("Save", { exact: true });
    await saveButton.click();
  } else {
    const saveButton = settingsFrame
      .locator("#user-settings-main-modal")
      .getByText("Save", { exact: true });
    await saveButton.click();
    return;
  }
}

export async function performanceSubmitForApprovalInvoice(page, identifer) {
  // click invoice tab
  await page.locator(`.rtsLI:has-text("Invoices")`).click();

  // submit for Approval invoice
  let frame = await (await page.waitForSelector("#Iframe7")).contentFrame();
  let invoiceRow = frame.locator(`tbody tr:has-text("${identifer}")`);
  const invoiceNo = await invoiceRow
    .locator(`td.accounting-checkbox + td >> a`)
    .innerText();

  // -- Click the kebab menu
  await invoiceRow.locator(`a.invoice-action-list`).click();

  // -- Click the option "submit for approval"
  await invoiceRow
    .locator(`a.invoice-options-link:has-text("Submit for Approval")`)
    .click();

  // -- Click the approval confirmation
  await page.mouse.wheel(0, 400);
  await frame.getByRole("button", { name: "Submit" }).click();

  return invoiceNo;
}

export async function performanceUploadFileMattersPage(page, filePath, fileName) {
  // Click the documents tab
  await page.locator('.rtsLink:has-text("Documents")').click();

  // Set the file to the specified path
  page.once("filechooser", async (chooser) => {
    await setFilesWithLogging(chooser, filePath, "Upload File Matters Page");
  });

  // Click on the file upload icon, upward arrow
  await page.locator('[data-bind="click: uploadDocuments"]').click();

  // Click on the select file button, the file should be automatically selected afterward
  await page.locator("#DocumentUploadDropzone").click();

  // Click on the upload button on the modal
  await page
    .locator(
      '#upload-documents-modal [data-bind*="click: uploadBulkDocuments"]',
    )
    .click();

  // Wait for file success toast to be visible
  await page.waitForSelector(
    '.toast-success:has-text("Files uploaded successfully.")',
  );

  // Wait for file success toast to disappear
  await page.waitForSelector(
    '.toast-success:has-text("Files uploaded successfully.")',
    { state: "hidden" },
  );

  // Click on complete upload
  await page
    .locator('#upload-documents-modal a:has-text("Complete Upload")')
    .click();

  // Wait for the file to be visible in the document list
  await page.waitForSelector(
    `#document-list-grid tr:has-text("${fileName.split(".")[0]}"):visible`,
  );
}
export async function performanceCreateACompanyContact(page, contact = {}, submit = true) {
  // Data validation
  if (!contact.firstName) {
    throw new Error(`🛑 Contact must have a first name 🛑`);
  } else if (!contact.lastName) {
    throw new Error(`🛑 Contact must have a last name 🛑`);
  } else if (!contact.email) {
    throw new Error(`🛑 Contact must have an email 🛑`);
  }

  // Navigate to contacts page
  await page
    .locator(`#navigation [href="/Contacts/Pages/Contacts.aspx"]`)
    .click();
  await page.waitForLoadState("domcontentloaded");

  // Click the plus icon in the section header
  await page.locator(`div.widget-header >> a:text("+")`).click();

  // Select "New Person" from the dropdown
  await page.locator(`[onclick="GoToCompanyModal();"]`).click();
  await page.waitForLoadState("domcontentloaded");

  // -- First name
  await page.locator(`#person-firstName`).fill(contact.firstName);

  // -- Last name
  await page.locator(`#person-lastName`).fill(contact.lastName);

  // Fill out email
  await page.locator(`input#person-emailAddress`).fill(contact.email);
  await page.locator(`input#person-primary-emailAddress`).check();

  // -- Submit
  if (submit) {
    await page.locator(`#contact-person-modal .save-buttons:visible`).click();
  } else {
    console.warn(`🟡 Contact has not been created 🟡`);
    return contact;
  }

  // Search for new contact
  const fullName = `${contact.firstName} ${contact.lastName}`;
  await page.locator(`#page-search`).fill(fullName);
  await page.keyboard.press("Enter");
  await page.waitForLoadState("domcontentloaded");

  // Assert new contact has been created
  try {
    await expect(
      page
        .locator(`li[class="eachContact"]:has-text("${fullName}"):visible`)
        .first(),
    ).toBeVisible();
  } catch {
    throw new Error(`🛑 Error creating contact 🛑`);
  }
  await page.waitForLoadState("domcontentloaded");
}

export async function performanceCleanUpTaskFromTaskPageWithReset(page, taskName) {
  // go to task page
  await page.locator(`#tasks a`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  //click on the advance search
  await page.locator(`.adv-search`).click();

  // reset the filters
  await page.locator(`a[class="select2-search-choice-close"]`).click();
  // click outside to close dropdown
  await page.mouse.click(0, 50);
  // click search for task
  await page.locator(`#page-search`).click();
  //type task
  await page.keyboard.type(taskName);

  // click on the search
  await page.locator(`#btnSearch`).click();
  await page.waitForTimeout(3000);

  if (
    await performanceIsVisible(
      page,
      `#listcontent .super-task-container:has-text("${taskName}"):visible`,
      4000,
    )
  ) {
    while (
      (await page
        .locator(`#listcontent .super-task-container:has-text("${taskName}")`)
        .count()) > 0
    ) {
      const deleteRow = page
        .locator(`#listcontent .super-task-container:has-text("${taskName}")`)
        .first();

      await expect(async () => {
        await deleteRow.locator(`.task-actions-button`).click();

        await deleteRow
          .locator(`.dropdown-menu li:has-text("Delete")`)
          .click({ timeout: 5_000 });
      }).toPass({ timeout: 60 * 1000 });

      if (
        await page
          .locator('#generic-confirm-modal:has-text("dependent steps")')
          .isVisible()
      ) {
        await page.locator("#workflowTaskLeaveDependents").click();
        await page
          .locator('.generic-confirm-choices a:has-text("DELETE")')
          .click();
      } else if (await performanceIsVisible(page, `.recurring-task-dialog`, 1000)) {
        // if recurring event
        await page.locator(`[data-bind="click: deleteSingleTask"]`).click();
      } else {
        // Click delete in modal
        await page.locator(`[role="dialog"] .deleteButtonClass`).click();
      }

      // wait for toast message
      await expect(
        page.locator(`.toast-success:has-text("Task deleted successfully!")`),
      ).toBeVisible();
      await page
        .locator(`.toast-success:has-text("Task deleted successfully!")`)
        .click();
      await expect(
        page.locator(`.toast-success:has-text("Task deleted successfully!")`),
      ).not.toBeVisible({ timeout: 10000 });
    }
  }
}

export async function performanceAddAnExpenseFromTimePage(page, expense, matter) {
  const { dateFns, faker } = npmImports;
  // Data validation
  if (!expense.type) {
    throw new Error(
      `🛑 Expense must have a type 🛑 ("Check", "Expense", or "Credit Card")`,
    );
  }
  // go to time tab
  await page.locator(`#time a`).click();
  // click on expenses
  await page.locator(`a#expenses`).click();

  // Click the plus icon in the section header
  await page.locator(`#add-expense-entry`).click();

  switch (expense.type) {
    case "Check":
      // Populate expense object with defaults if needed
      if (!expense.account) expense.account = "Operating Account";
      if (!expense.payableTo) expense.payableTo = "Leslie Knope";
      if (!expense.street) expense.street = "123 Main St.";
      if (!expense.city) expense.city = "Seattle";
      if (!expense.state) expense.state = "WA";
      if (!expense.zipCode) expense.zipCode = "98101";
      if (!expense.memo) expense.memo = faker.lorem.sentence();
      if (!expense.date)
        expense.date = dateFns.format(new Date(), "MM/dd/yyyy");
      if (!expense.amount)
        expense.amount = faker.datatype
          .number({ min: 10, max: 99, precision: 0.01 })
          .toString();
      if (!expense.assignedAccount)
        expense.assignedAccount = "Accounts Receivable";
      if (!expense.description) expense.description = faker.lorem.sentence();
      if (!expense.sampleFile) expense.sampleFile = "avatar.png";

      // Click the option "New Check (hard-cost)"
      await page
        .locator(`.drp-down-option a:has-text("New Check (hard-cost)")`)
        .click();

      // Fill all input fields from the details object
      // -- New Check Account
      await page
        .locator('label:has-text("Account") + .new-chk__cell a')
        .click();
      await page.getByRole("option", { name: expense.account }).click();

      // -- Payable to
      await page
        .locator(
          'label:has-text("Payable To") + .new-chk__select-flt .select2-choice',
        )
        .click();
      await page.keyboard.type(expense.payableTo);
      await page.getByRole("option", { name: expense.payableTo }).click();

      // -- Address
      await page.locator(`.new-chk__streetaddress`).fill(expense.street);
      await page.locator(`.new-chk__city`).fill(expense.city);
      await page.locator(`.new-chk__state`).fill(expense.state);
      await page.locator(`.new-chk__zip`).fill(expense.zipCode);

      // -- Date
      await page
        .locator(
          `[for="new-chk-datepicker"] + .new-chk__date .k-datepicker .k-select`,
        )
        .click();
      await page.locator("#new-chk-datepicker").fill(expense.date);

      // -- Amount
      await page
        .locator(
          '.new-chk__box_right label:has-text("Amount") + div [data-bind*="numericInput"]',
        )
        .fill(expense.amount);

      // -- Memo
      await page.locator(`.new-chk__memo`).fill(expense.memo);

      // -- Assign Account
      await page.getByRole("link", { name: "Select..." }).click();
      await page
        .getByRole("option", { name: expense.assignedAccount, exact: true })
        .click();

      // -- Description
      await page
        .locator(`.line-item .det__desc textarea`)
        .fill(expense.description);

      // -- -- Matter
      if (matter && matter.name) {
        // -- -- Matter
        await page.locator(`#s2id_nc-matter-dp`).click();
        await page.keyboard.type(matter.name);
        await page
          .locator(`div.select2-result-label:has-text('${matter.name}')`)
          .click();
      }

      // -- Attachment
      // page.once("filechooser", async (chooser) => {
      //   await setFilesWithLogging(chooser, `/home/wolf/files/${expense.sampleFile}`, "Time Page Expense");
      // });
      // await page.click("#new-check-document-file-input");

      // Click "Save & Close"
      await page.locator(`button:has-text("Save & Close"):visible`).click();

      // Assert "Check created successfully!" toast notification
      await expect(
        page.locator(
          `div.toast-message:has-text("Check created successfully!")`,
        ),
      ).toBeVisible();
      
      // Wait for the toast to disappear
      await expect(
        page.locator(
          `div.toast-message:has-text("Check created successfully!")`,
        ),
      ).not.toBeVisible({ timeout: 10000 });
      return expense;

    case "Expense":
      // Populate expense object with defaults if needed
      if (!expense.softCostType) expense.softCostType = "QA";
      if (!expense.description) expense.description = faker.lorem.sentence();
      if (!expense.quantity)
        expense.quantity = faker.datatype
          .number({ min: 1, max: 20 })
          .toString();
      if (!expense.price)
        expense.price = faker.datatype
          .number({ min: 10, max: 99, precision: 0.01 })
          .toString();

      // Click the option "New Expense (soft-cost)"
      await page.locator(`a:has-text("New Expense (soft-cost)")`).click();

      //fill out matter
      await page
        .locator(
          `b[role="presentation"]:below(label:has-text("Matter")):visible >> nth=0`,
        )
        .click();

      await page.keyboard.type(matter.name);
      await page
        .locator(`div.select2-result-label:has-text('${matter.name}')`)
        .click();
      // Fill all input fields from the details object
      // Fill out soft cost type
      await page
        .getByLabel(`New Soft Cost`)
        .getByRole(`link`, { name: `-Type or Select-` })
        .click();
      await page
        .locator(`input.select2-input:visible`)
        .fill(expense.softCostType);
      await page.getByRole("option", { name: expense.softCostType }).click();

      // Fill out description
      await page.locator(`#sc_SoftCostDesc`).fill(expense.description);

      // Fill out quantity
      await page.locator(`#sc_SoftCostQtn`).fill(expense.quantity);

      // Fill out unit price
      await page.locator(`#sc_SoftCostPrice`).fill(expense.price);

      // Click "Save & Close"
      await page.locator(`#scBtnSave:visible`).click();

      // Assert "New expense was added successfully!" toast notification is visible
      await expect(
        page.locator(
          `div.toast-message:has-text("New expense was added successfully!")`,
        ),
      ).toBeVisible();
      await page
        .locator(
          `div.toast-message:has-text("New expense was added successfully!")`,
        )
        .click();
      await expect(
        page.locator(
          `div.toast-message:has-text("New expense was added successfully!")`,
        ),
      ).not.toBeVisible();
      return expense;

    case "Credit Card": {
      {
        // Populate expense object with defaults if needed
        if (!expense.account) expense.account = "QA Wolf Card 1";
        if (!expense.payableTo) expense.payableTo = "Leslie Knope";
        if (!expense.memo) expense.memo = faker.lorem.sentence();
        if (!expense.amount)
          expense.amount = faker.datatype
            .number({ min: 10, max: 99, precision: 0.01 })
            .toString();
        if (!expense.assignedAccount1)
          expense.assignedAccount1 = "Accounts Receivable";
        if (!expense.assignedAccount2)
          expense.assignedAccount2 = "Accumulated Depreciation";
        if (!expense.description1)
          expense.description1 = faker.lorem.sentence();
        if (!expense.description2)
          expense.description2 = faker.lorem.sentence();
        if (!expense.sampleFile) expense.sampleFile = "avatar.png";

        // Click the option "New Credit Card (hard-cost)"
        await page
          .locator(`.invoice-options a:has-text("New Credit Card (hard-cost)")`)
          .click();

        // Click the plus icon in the "Assign Accounts & Matters" section
        try {
          await page
            .locator(`input[type="button"]:visible`)
            .click({ timeout: 5 * 1000 });
        } catch {
          await page.keyboard.press("Escape");
          await page.locator(`input[type="button"]:visible`).click();
        }

        // Fill out all fields with the input object
        // -- Account
        await page
          .locator(`b:below(label[for="new-creditcard-accounts"]) >> nth=0`)
          .click();
        await page.keyboard.type(expense.account);
        await page.getByRole("option", { name: expense.account }).click();
        // -- Payable To
        await page
          .locator(`b:below(label:text-is("Payable To"):visible) >> nth=0`)
          .click();
        await page.keyboard.type(expense.payableTo);
        await page.getByRole("option", { name: expense.payableTo }).click();
        // -- Memo
        await page.locator(`input.new-creditcard__memo`).fill(expense.memo);
        // -- Amount
        await page.locator(`input#new-creditcard-amount`).fill(expense.amount);

        // -- Account 1
        const accountLine1 = await page.locator(
          `table.new-creditcard-items >> tbody >> tr >> nth=0`,
        );
        // -- -- Assigned Account
        await accountLine1.locator(`div#s2id_ddlAccounts`).click();
        await page
          .locator(
            `li >> div.select2-result-label:text-is("${expense.assignedAccount1}")`,
          )
          .click();
        // -- -- Description
        await accountLine1.locator(`textarea`).fill(expense.description1);
        // -- -- Amount
        await accountLine1
          .locator(`input.num-field`)
          .fill(String((Number(expense.amount) - 1).toFixed(2)));

        await accountLine1.locator(`#s2id_nc-matter-dp`).click();
        await page.keyboard.type(matter.name);
        // await accountLine1.press("Enter")
        await page
          .locator(`div.select2-result-label:has-text('${matter.name}')`)
          .click();

        // -- Account 2
        const accountLine2 = await page.locator(
          `table.new-creditcard-items >> tbody >> tr >> nth=1`,
        );
        // -- -- Assigned Account
        await accountLine2.locator(`div#s2id_ddlAccounts`).click();
        await page
          .locator(
            `li >> div.select2-result-label:text-is("${expense.assignedAccount2}")`,
          )
          .click();
        // -- -- Description
        await accountLine2.locator(`textarea`).fill(expense.description2);
        // -- -- Amount
        await accountLine2.locator(`input.num-field`).fill("1.00");
        // -- -- Matter
        await accountLine2.locator(`#s2id_nc-matter-dp`).click();
        await page.keyboard.type(matter.name);
        // await accountLine1.press("Enter")
        await page
          .locator(`div.select2-result-label:has-text('${matter.name}')`)
          .click();

        // Upload a sample file
        // page.once("filechooser", async (chooser) => {
        //   await setFilesWithLogging(chooser, `/home/wolf/files/${expense.sampleFile}`, "Credit Card Expense (Another)")
        //     .catch(console.error);
        // });
        // await page.click("div.accounting-modal-document-attach-btn:visible");

        // Click "Save & Close"
        await page.locator(`button:has-text("Save & Close"):visible`).click();

        // Assert "Credit Card created successfully!" toast notification is visible
        await expect(
          page.locator(
            `.toast-success:has-text("Credit Card created successfully!")`,
          ),
        ).toBeVisible();
        
        // Wait for the toast to disappear
        await expect(
          page.locator(
            `.toast-success:has-text("Credit Card created successfully!")`,
          ),
        ).not.toBeVisible({ timeout: 10000 });
        return expense;
      }
    }
    default:
      throw new Error(
        `🛑 Invalid Type! Must be: "Check", "Expense", or "Credit Card" 🛑`,
      );
  }
}

export async function performanceDeleteInvoice(page, identifer) {
  // click invoice tab
  await page.locator(`.rtsLI:has-text("Invoices")`).click();

  // Approve invoice
  let frame = await (await page.waitForSelector("#Iframe7")).contentFrame();
  let invoiceRow = frame.locator(`tbody tr:has-text("${identifer}")`);
  const invoiceNo = await invoiceRow
    .locator(`td:has(a[onclick^="onClickOfInvoice"]) >> a`)
    .first()
    .innerText();

  // -- Click the kebab menu
  await invoiceRow.locator(`a.invoice-action-list`).click();

  // -- Click the option "Delete"
  await invoiceRow.locator(`a.invoice-options-link:has-text("Delete")`).click();

  // -- Click the approval confirmation
  await page.mouse.wheel(0, 400);
  await frame.locator(`button[class^="deleteButtonClass"]`).click();

  //click refresh button
  await frame.locator(".picture-icon").first().click();
  return;
}

export function performanceCalculateDateWithinLastMonth(daysAgo) {
  const { dateFns } = npmImports;
  const currentDate = new Date();
  const targetDate = dateFns.subDays(currentDate, daysAgo);

  const previousMonth = dateFns.addMonths(currentDate, -1);
  const startOfPreviousMonth = dateFns.startOfMonth(previousMonth);
  const endOfPreviousMonth = dateFns.endOfMonth(previousMonth);

  // If target date is not within the previous month, adjust accordingly
  if (targetDate < startOfPreviousMonth || targetDate > endOfPreviousMonth) {
    return startOfPreviousMonth; // or any other valid date within the previous month
  }

  return targetDate;
}

// Function to calculate a date within the current month
export function performanceCalculateDateWithinCurrentMonth(daysAgo) {
  const { dateFns } = npmImports;
  const currentDate = new Date();
  const targetDate = dateFns.subDays(currentDate, daysAgo);

  if (targetDate.getMonth() !== currentDate.getMonth()) {
    // If target date is not in the current month, adjust to the first day of the month
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }

  return targetDate;
}
//function to delete calendar events
export async function performanceCleanUpCalendarEvents(page, eventName) {
  await page.locator(`#page-search`).click();
  await page.keyboard.type(eventName, { delay: 100 });
  await page.keyboard.press("Enter");
  if (
    await performanceIsVisible(
      page,
      `.calendar-search-result-item a:has-text("${eventName}")`,
      3000,
    )
  ) {
    while (
      await page
        .locator(`.calendar-search-result-item a:has-text("${eventName}")`)
        .count()
    ) {
      await page.locator(`.calendar-search-result-item a`).first().click();
      await page.locator(`#event-entry-modal .btn-danger`).click();

      if (
        await performanceIsVisible(
          page,
          `#generic-confirm-modal p p:has-text("The event can be deleted once the workflow is complete.")`,
          1000,
        )
      ) {
        await handleCancelWorkflow(page);

        await page.locator(`.calendar-search-result-item a`).first().click();
        await page.locator(`#event-entry-modal .btn-danger`).click();
        await page
          .locator(`#generic-confirm-modal a:has-text("Delete"):visible`)
          .click();
      } else {
        await page.getByRole("link", { name: "DELETE", exact: true }).click();
        await page.waitForTimeout(2000);
      }
    }
  }
}

export async function performanceHandleCancelWorkflow(page) {
  // click ok
  await page.locator(`#generic-confirm-modal .generic-ok-btn:visible`).click();

  // close modal
  await page
    .locator(`[aria-describedby="event-entry-modal"] .ui-dialog-titlebar-close`)
    .click();

  // open matter associated with Calendar
  const [matterPage] = await Promise.all([
    page.waitForEvent("popup"),
    page
      .locator(`.calendar-search-result-item [data-bind$="goToMatter"]`)
      .first()
      .click(),
  ]);
  await matterPage.waitForLoadState("domcontentloaded");

  // go to workflow
  await matterPage.locator(`.workflows-tab a`).click();

  // filter by In Progress
  await matterPage.locator(`#workflow-runs-in-progress`).click();
  await matterPage.waitForTimeout(3_000);

  await matterPage.evaluate(() =>
    window.scrollTo(0, document.body.scrollHeight),
  );

  await matterPage.waitForTimeout(2_000);

  // cancel all running WFs
  await matterPage.waitForSelector(`#workflow-runs-grid tbody tr >> nth = 0`);

  while (
    (await matterPage.locator(`#workflow-runs-grid tbody tr`).count()) > 0
  ) {
    let cancelRow = matterPage.locator(`#workflow-runs-grid tbody tr`).first();

    // click ellipsis
    await cancelRow.locator(`.fa-ellipsis-v`).hover();

    // click cancel
    await cancelRow
      .locator(`.cw-grid-action-menu li:has-text("Cancel Running Workflow")`)
      .click();

    // click confirm
    await matterPage
      .locator(
        `[aria-describedby="workflowrun-modal"] [data-bind="click: cancelWorkflowRun"]`,
      )
      .click();

    // wait for WF to dissapear
    await matterPage.waitForTimeout(2000);
  }

  await matterPage.close();
}

export async function performanceLogInWithUndetectableContext(options = {}) {
  // Navigate to DEFAULT_URL
  const { browser, context } = await launchUndetectableContext({ ...options });
  const page = await context.newPage();
  await page.goto(buildUrl());

  // Log in
  await page.locator(`#txtUserName`).click();
  await page.keyboard.type(options.email || process.env.DEFAULT_USER);

  await page.locator(`#txtPwd`).click();
  await page.keyboard.type(
    options.password || process.env.DEFAULT_LEGAL_PASSWORD,
  );
  await page.locator(`#loginBtn`).click();
  // wait for load
  await page.waitForLoadState("load");

  // if modal appears - close
  if (await performanceIsVisible(page, `#pendo-guide-container`, 5000)) {
    await page.locator(`[aria-label="Close"]`).click();
  }

  // // assert logged in
  // -- Header (top left nav "Caret Legal") to be visible
  await expect(
    page.locator(`#pageheader-brand-reg[alt="CARET Legal"]`),
  ).toBeVisible();

  // -- Avatar (top right nav) should be visible
  await expect(page.locator(`[href="#"] #imgUserPic`)).toBeVisible();

  await page.waitForLoadState("domcontentloaded");

  return { browser, context, page };
}
export async function performanceLaunchUndetectableContext(options = {}) {
  // - declare random user agents
  const userAgentStrings = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.2227.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.2228.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.3497.92 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];
  const userAgent =
    userAgentStrings[Math.floor(Math.random() * userAgentStrings.length)];
  options.viewport = {
    width: 1200,
    height: 768,
  };
  // - launch context with random user agent and disabled blink features
  const { context, browser } = await launch({
    // userAgent: 'dart',
    userAgent,
    args: ["--disable-blink-features=AutomationControlled"],
    ...options,
  });

  // - disable webdriver
  await context
    .addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    })
    .then(() => {})
    .catch((e) => {
      console.error(e);
      throw e;
    });

  return { context, browser };
}

export async function performanceCleanupTimeEntryFromTimePage(page) {
  // Click 'Time' on the left in the quick access
  await page.locator(`#time a`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(5000);

  // Show 100 records
  await page
    .locator(
      '.k-label:has-text("items per page"):visible >> [aria-label="select"]',
    )
    .scrollIntoViewIfNeeded();
  await page
    .locator(
      '.k-label:has-text("items per page"):visible >> [aria-label="select"]',
    )
    .click();
  await page.locator(`[role="option"]:has-text("100"):visible`).click();
  await page.waitForTimeout(5000);

  const count = await page.locator(`[role="grid"] tbody tr:visible`).count();

  for (let i = 0; i < count; i++) {
    let row = page.locator(`[role="grid"] tbody tr:visible`).first();
    if (
      await row.locator(`.invoiceStatusCell:text-is('Invoiced')`).isVisible()
    ) {
      const [matterPage] = await Promise.all([
        page.waitForEvent("popup"),
        row.locator(`[onclick*="Matters"]`).click(),
      ]);
      await matterPage.waitForTimeout(8000);
      await matterPage.locator(`.rtsLI:has-text('Invoices')`).click();
      let frame = await (
        await matterPage.waitForSelector("#Iframe7")
      ).contentFrame();
      let invoiceNo = await frame
        .locator(`td.accounting-checkbox + td >> a`)
        .first()
        .innerText();
      await deleteInvoice(matterPage, invoiceNo);

      await matterPage.close();
      await page.locator(`[data-bind="click: refreshGridData"]`).click();
      // accept dialog
      page.once("dialog", async (dialog) => await dialog.accept());

      await row.locator(`.fa-trash:visible >> nth=0`).click();
      await page.locator(`.toast-success`).waitFor({ state: "attached" });
      await page.locator(`.toast-success`).click();
      await page.locator(`.toast-success`).waitFor({ state: "detached" });
    } else {
      // accept dialog
      page.once("dialog", async (dialog) => await dialog.accept());

      await row.locator(`.fa-trash:visible >> nth=0`).click();
      await page.locator(`.toast-success`).waitFor({ state: "attached" });
      await page.locator(`.toast-success`).click();
      await page.locator(`.toast-success`).waitFor({ state: "detached" });
    }
  }
}
export async function performanceCleanupTimeEntryFromTimePageWithIdentifier(
  page,
  userIdentifier,
) {
  // Click 'Time' on the left in the quick access
  await page.locator(`#time a`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(5000);

  await page.locator(`a.adv-search`).first().click();
  await page.locator(`div[id='s2id_te_UserList']`).click();
  // type in the user
  await page.keyboard.type(userIdentifier);

  if (
    await page
      .locator(`#select2-results-33`)
      .getByText(`No matches found`)
      .isVisible()
  ) {
    await page.mouse.click(0, 0);
    return;
  }
  // click the user option
  await page.getByRole(`option`, { name: userIdentifier }).click();
  // search
  await page.locator(`#btnSearch`).click();
  // wait for it to load
  await page.waitForTimeout(5000);
  // Show 100 records
  await page
    .locator(
      '.k-label:has-text("items per page"):visible >> [aria-label="select"]',
    )
    .scrollIntoViewIfNeeded();
  await page
    .locator(
      '.k-label:has-text("items per page"):visible >> [aria-label="select"]',
    )
    .click();
  await page.locator(`[role="option"]:has-text("100"):visible`).click();
  await page.waitForTimeout(5000);

  const count = await page.locator(`[role="grid"] tbody tr:visible`).count();

  for (let i = 0; i < count; i++) {
    let row = page.locator(`[role="grid"] tbody tr:visible`).first();
    if (
      await row.locator(`.invoiceStatusCell:text-is('Invoiced')`).isVisible()
    ) {
      const [matterPage] = await Promise.all([
        page.waitForEvent("popup"),
        row.locator(`[onclick*="Matters"]`).click(),
      ]);
      await matterPage.waitForTimeout(8000);
      await matterPage.locator(`.rtsLI:has-text('Invoices')`).click();
      let frame = await (
        await matterPage.waitForSelector("#Iframe7")
      ).contentFrame();
      let invoiceNo = await frame
        .locator(`td.accounting-checkbox + td >> a`)
        .first()
        .innerText();
      await deleteInvoice(matterPage, invoiceNo);

      await matterPage.close();
      await page.locator(`[data-bind="click: refreshGridData"]`).click();
      // accept dialog
      page.once("dialog", async (dialog) => await dialog.accept());

      await row.locator(`.fa-trash:visible >> nth=0`).click();
      await page.locator(`.toast-success`).waitFor({ state: "attached" });
      await page.locator(`.toast-success`).click();
      await page.locator(`.toast-success`).waitFor({ state: "detached" });
    } else {
      // accept dialog
      page.once("dialog", async (dialog) => await dialog.accept());

      await row.locator(`.fa-trash:visible >> nth=0`).click();
      await page.locator(`.toast-success`).waitFor({ state: "attached" });
      await page.locator(`.toast-success`).click();
      await page.locator(`.toast-success`).waitFor({ state: "detached" });
    }
  }
}
export function performanceAreCookiesArraysEqual(cookies1, cookies2) {
  if (cookies1.length !== cookies2.length) {
    return false;
  }

  return cookies1.every((cookie1, index) => {
    const cookie2 = cookies2[index];
    return (
      cookie1.name === cookie2.name &&
      cookie1.value === cookie2.value &&
      cookie1.domain === cookie2.domain &&
      cookie1.path === cookie2.path &&
      cookie1.expires === cookie2.expires &&
      cookie1.httpOnly === cookie2.httpOnly &&
      cookie1.secure === cookie2.secure
    );
  });
}
export async function performanceCleanUpReportsByName(page, reportName) {
  let reportsExist = true;
  while (reportsExist) {
    // Click on the "Scheduled Reports" to open the dropdown
    await page.locator(`a:has-text("Scheduled Reports")`).click();

    // Ensure the dropdown is open
    await page
      .locator("div.dropdown-menu.pull-right")
      .waitFor({ state: "visible" });

    // Get the first visible report matching the name
    const reportSpan = page
      .locator(
        `span[data-bind*="editReport"]:has-text('${reportName}'):visible`,
      )
      .first();

    // Check if the report span exists, if not, break the loop
    if ((await reportSpan.count()) === 0) {
      break; // Exit loop if no more reports are found
    }

    // Click on the report to open it
    await reportSpan.click();

    // Wait for the "Delete This Report" span to be visible
    await page
      .locator('span.task-delete:has-text("Delete This Report")')
      .waitFor({ state: "visible" });

    // Click on the "Delete This Report" span
    await page
      .locator('span.task-delete:has-text("Delete This Report")')
      .click();

    // Wait for the toast message confirming deletion to appear
    const toastLocator = page.locator(
      '.toast-success:has-text("Report Deleted.")',
    );
    await toastLocator.waitFor({ state: "visible" });

    // Ensure the toast message is no longer visible
    await toastLocator.waitFor({ state: "hidden" });
  }
}

export async function performanceReadQRCode(page, selector) {
  const { pngjs, jsQR } = npmImports;
  const buffer = await page.locator(selector).screenshot();
  const png = await new Promise((resolve, reject) => {
    new pngjs.PNG().parse(buffer, function (error, data) {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
  const code = jsQR(Uint8ClampedArray.from(png.data), png.width, png.height);
  return code?.data ?? null;
}
export async function performanceCleanupTimeEntryFromTimePageAdv(page, matterNo) {
  // Click 'Time' on the left in the quick access
  await page.locator(`#time a`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(5000);

  await page.getByRole(`textbox`, { name: `Search` }).fill(matterNo);

  await page.keyboard.press("Enter");

  await page.waitForTimeout(3000);

  const count = await page.locator(`[role="grid"] tbody tr:visible`).count();

  for (let i = 0; i < count; i++) {
    let row = page.locator(`[role="grid"] tbody tr:visible`).first();
    if (
      await row.locator(`.invoiceStatusCell:text-is('Invoiced')`).isVisible()
    ) {
      const [matterPage] = await Promise.all([
        page.waitForEvent("popup"),
        row.locator(`[onclick*="Matters"]`).click(),
      ]);
      await matterPage.waitForTimeout(8000);
      await matterPage.locator(`.rtsLI:has-text('Invoices')`).click();
      let frame = await (
        await matterPage.waitForSelector("#Iframe7")
      ).contentFrame();
      let invoiceNo = await frame
        .locator(`td.accounting-checkbox + td >> a`)
        .first()
        .innerText();
      await deleteInvoice(matterPage, invoiceNo);

      await matterPage.close();
      await page.locator(`[data-bind="click: refreshGridData"]`).click();
      // accept dialog
      page.once("dialog", (dialog) => void dialog.accept());

      await row.locator(`.fa-trash:visible >> nth=0`).click();
      await page.locator(`.toast-success`).waitFor({ state: "attached" });
      await page.locator(`.toast-success`).click();
      await page.locator(`.toast-success`).waitFor({ state: "detached" });
    } else {
      // accept dialog
      page.once("dialog", (dialog) => void dialog.accept());

      await row.locator(`.fa-trash:visible >> nth=0`).click();
      await page.locator(`.toast-success`).waitFor({ state: "attached" });
      await page.locator(`.toast-success`).click();
      await page.locator(`.toast-success`).waitFor({ state: "detached" });
    }
  }
}

export async function performanceRecordPaymentInvoice(
  page,
  identifer,
  paymentMethod = "BANK OF AMERICA NW N.A.-",
) {
  // Click invoice tab
  await page.locator(`.rtsLI:has-text("Invoices")`).click();

  // Record payment for invoice
  let frame = await (await page.waitForSelector("#Iframe7")).contentFrame();
  let invoiceRow = frame.locator(`tbody tr:has-text("${identifer}")`);
  identifer = await invoiceRow
    .locator(`td.accounting-checkbox + td >> a`)
    .innerText();

  // -- Click the kebab menu
  await invoiceRow.locator(`a.invoice-action-list`).click();

  // -- Click the option "Record Payment"
  await invoiceRow
    .locator(`a.invoice-options-link:has-text("Record Payment")`)
    .click();

  await page.getByRole(`option`, { name: `Primary Client` }).click();

  await page.getByRole(`link`, { name: `Choose` }).click();

  // Select the payment method dynamically
  await page.getByRole(`option`, { name: `${paymentMethod}` }).click();

  // Click the Save button
  await page
    .getByLabel(`Record Payment`)
    .getByText(`Save`, { exact: true })
    .click();

  // Click refresh button
  await frame.locator(".picture-icon").first().click();

  // Return
  return;
}

export async function performanceRecordInvoicePaymentFromMatterPage(page, identifer) {
  const { faker } = npmImports;
  // Click invoice tab
  await page.locator(`.rtsLI:has-text("Invoices")`).click();

  // Record payment for invoice
  let frame = await (await page.waitForSelector("#Iframe7")).contentFrame();
  let invoiceRow = frame.locator(`tbody tr:has-text("${identifer}")`);
  identifer = await invoiceRow
    .locator(`td.accounting-checkbox + td >> a`)
    .innerText();

  // -- Click the kebab menu
  await invoiceRow.locator(`a.invoice-action-list`).click();

  // -- Click the option "Record Payment"
  await invoiceRow
    .locator(`a.invoice-options-link:has-text("Record Payment")`)
    .click();

  try {
    await page.getByRole(`option`, { name: `Primary Client` }).click();
  } catch {
    console.log("Did not click client");
  }

  await page
    .getByRole(`textbox`, { name: `Reference number` })
    .fill(`${faker.datatype.number({ min: 1, max: 9999 }).toString()}`);

  // Click the Save button
  await page
    .getByLabel(`Record Payment`)
    .getByText(`Save`, { exact: true })
    .click();

  // Click refresh button
  await frame.locator(".picture-icon").first().click();

  // Return
  return;
}

export async function performanceCleanUpTimeExpenses(page, matterName) {
  // Navigate to the matter page
  await goToMatter(page, matterName);

  // Click the "Time/Expenses" link and wait for the page to load
  await page.getByRole("link", { name: "Time/Expenses" }).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  // Locate the frame
  const frame = page.frameLocator('[id="Iframe6"]');

  // Count rows in the table
  const tableCount = await frame
    .locator(
      '.k-grid-content table[role="grid"] tbody[role="rowgroup"] tr[role="row"]',
    )
    .count();
  console.log(`Table row count: ${tableCount}`);

  if (tableCount > 0) {
    // Automatically accept the dialog
    page.once("dialog", (dialog) => dialog.accept());

    // Locate and click the delete icon in the first row
    await frame
      .locator(
        '.k-grid-content table[role="grid"] tbody[role="rowgroup"] tr[role="row"] i.fa-trash',
      )
      .first()
      .click();
    console.log("Delete icon clicked.");
  } else {
    console.log("No rows found to delete.");
  }
}

export async function performanceLoginActiveMicrosoftAccount(options) {
  // Get cookies from options
  const cookies = options.cookies;

  // Launch a browser and create a context
  const { context, browser } = await launch({ slowMo: 1000, ...options });

  // Add cookies to the context
  await context.addCookies(JSON.parse(cookies));

  // Create a new page and navigate to a URL
  const page = await context.newPage();
  await page.goto("https://outlook.office.com/");

  // Click the account to log in
  await page
    .locator(`[aria-label="Enter your email, phone, or Skype."]`)
    .fill(options.email);
  await page.locator(`:text("Next")`).click();

  try {
    try {
      await page
        .locator(`div`)
        .filter({ hasText: /^Use your password$/ })
        .click({ timeout: 5000 })
        .catch(console.error);
      await page
        .getByPlaceholder("Password")
        .fill(process.env.DEFAULT_LEGAL_PASSWORD, { timeout: 5000 });
      await page
        .locator(`[data-testid="textButtonContainer"]`)
        .getByRole(`button`, { name: `Sign in` })
        .click();
    } catch {
      await page
        .getByRole(`textbox`, { name: `Password` })
        .fill(process.env.DEFAULT_LEGAL_PASSWORD, { timeout: 5000 });
      await page.locator(`[data-testid="primaryButton"]`).click();
    }
    await page.getByRole(`button`, { name: `No` }).click();
    await page.waitForTimeout(5000);
  } catch {
    console.log("No need to fill in the password");
  }

  if (
    await page.getByText(`We found an account you can use here:`).isVisible()
  ) {
    await page.locator(`#newSessionLink`).click();
  }
  // click on the calendar
  await page.locator(`[alt="Calendar"]`).click();

  // Assert that we are logged in
  try {
    await expect(page).toHaveURL(
      "https://outlook.live.com/calendar/0/view/week",
      { timeout: 12 * 1000 },
    );
  } catch {
    await expect(page).toHaveURL(
      "https://outlook.live.com/calendar/0/view/month",
      { timeout: 12 * 1000 },
    );
  }
  await page.waitForSelector(`table[role="grid"]`);
  // Return
  console.log("Problem occurred when logging in");
  await page.mouse.click(0, 0);
  return { context, browser, page };
}

export async function performanceCleanUpBankAccount(page, accountName) {

    // Navigate to the Accounting section
    await page.getByRole("link", { name: " Accounting" }).click();
    // wait for page to load
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3_000);
    await page.getByRole("link", { name: "Banks & Registers" }).click();

    // Select the specified bank account from the dropdown
    await page.locator('#s2id_ddlAccounts').first().click()
    try {
      await page.getByText(accountName, { exact: true }).click();
    } catch {
      await page.mouse.click(0, 0);
    }

    // wait for page to load
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(10_000);

    // Filter the table by todays date
    await page.locator(`#hoursrange:visible`).click();
    await page.locator('.ranges ul li:has-text("Today"):visible').click();

    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(15_000);

    // Check if there are any entries to delete
    let deleteIcon = page
      .locator(`#grdCategoriesItems tr >> i.fa-trash-o`)
      .first();
    let hasEntries = await deleteIcon.isVisible();
    let deleteCount = 0; // To track the number of deletions

    while (hasEntries && deleteCount < 10) {
      // Handle confirmation dialogs
      page.once("dialog", (dialog) => {
        dialog.accept().catch((error) => {
          console.error("Failed to accept the dialog:", error);
        });
      });

      // Click on the delete icon if it is visible
      await deleteIcon.click();

      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(4_000);

      await page.locator(`.register-refresh`).click();

      // Wait for the deletion process to complete
      await page
        .locator("#loading-overlay")
        .getByRole("img")
        .waitFor({ state: "hidden" });

      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(4_000);

      // Check if there are more entries to delete
      hasEntries = await deleteIcon.isVisible();
      deleteCount++;
    }

    if (deleteCount >= 10) {
      console.warn(
        `Stopped cleanup after 10 deletions to avoid potential infinite loop.`,
      );
    } else {
      console.log(`Cleanup completed for bank account: ${accountName}`);
    }
 
}
export async function performanceHandleCancelWorkflowTask(page) {
  await page.hover(".colmatter-container .matterLabel.task-matter-label");
  // open matter link
  const [matterPage] = await Promise.all([
    page.waitForEvent("popup"),
    await page.getByText(`Go to this matter`).click(),
  ]);
  await matterPage.waitForLoadState("domcontentloaded");

  // go to workflow
  await matterPage.locator(`.workflows-tab a`).click();

  // filter by In Progress
  await matterPage.locator(`#workflow-runs-in-progress`).click();
  await matterPage.waitForTimeout(3_000);

  //scroll down and wait: hover is flaky
  await matterPage.evaluate(() =>
    window.scrollTo(0, document.body.scrollHeight),
  );

  await matterPage.mouse.wheel(0, 1000);

  await matterPage.waitForTimeout(3_000);

  // cancel all running WFs
  await matterPage.waitForSelector(`#workflow-runs-grid tbody tr >> nth = 0`);

  while (
    (await matterPage.locator(`#workflow-runs-grid tbody tr`).count()) > 0
  ) {
    let cancelRow = matterPage.locator(`#workflow-runs-grid tbody tr`).first();

    await matterPage.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight),
    );

    // click ellipsis
    await cancelRow.locator(`.fa-ellipsis-v`).hover();

    // click cancel
    await cancelRow
      .locator(`.cw-grid-action-menu li:has-text("Cancel Running Workflow")`)
      .click();

    // click confirm
    await matterPage
      .locator(
        `[aria-describedby="workflowrun-modal"] [data-bind="click: cancelWorkflowRun"]`,
      )
      .click();

    // wait for WF to dissapear
    await matterPage.waitForTimeout(2000);
  }

  await matterPage.close();
}

export async function performanceHandleTaskDeletion(page) {
  // Navigate to task page
  await page.locator(`#tasks a`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  let row = 0;
  let attempts = 0;

  // Click on "All" tasks
  await page.locator(`#All`).click();

  // Check if any task is visible
  if (
    await performanceIsVisible(page, `#listcontent .super-task-container:visible`, 4000)
  ) {
    while (
      attempts < 30 &&
      (await page
        .locator(`#listcontent .super-task-container:visible`)
        .count()) > 0
    ) {
      try {
        // Allow time for loading
        await page.waitForTimeout(2000);

        // Handle generic confirm modal if visible
        if (await performanceIsVisible(page, `.generic-confirm-modal-wrapper`, 1000)) {
          await page.getByRole(`link`, { name: `DELETE` }).click();
        }

        // Wait for confirmation
        await page.waitForTimeout(5000);

        // Refresh the task list
        await page.locator(`.tasks-rfrsh-btn`).first().click();

        // Locate and select the first task to delete
        const deleteRow = page
          .locator(`#listcontent .super-task-container:visible`)
          .nth(row);

        await deleteRow.locator(`.task-actions-button`).click();
        await deleteRow.locator(`.dropdown-menu li:has-text("Delete")`).click();

        // Handle scenarios if task cannot be deleted directly
        if (
          await performanceIsVisible(
            page,
            `[role="dialog"] div:has-text("This task was created by a still active automated workflow and cannot be deleted at this time.")`,
            1000,
          )
        ) {
          // Click OK and cancel workflow
          await page.getByRole("button", { name: "OK" }).click();
          await handleCancelWorkflowTask(page);
          await page.bringToFront();
          await page.waitForTimeout(5000);
        } else {
          // Handle recurring task deletion
          if (await performanceIsVisible(page, `.recurring-task-dialog`, 1000)) {
            await page.locator(`[data-bind="click: deleteSingleTask"]`).click();
          } else {
            // Confirm delete in modal
            await page.getByRole("button", { name: "Delete" }).click();
          }

          // Wait for and dismiss success toast
          await expect(
            page.locator(
              `.toast-success:has-text("Task deleted successfully!")`,
            ),
          ).toBeVisible();
          await page
            .locator(`.toast-success:has-text("Task deleted successfully!")`)
            .click();
          await expect(
            page.locator(
              `.toast-success:has-text("Task deleted successfully!")`,
            ),
          ).not.toBeVisible({ timeout: 10000 });
        }

        attempts++;
      } catch (error) {
        console.error("Error during task deletion:", error);
        row++;
        attempts++;
        continue;
      }
    }
  }
}

/**
 * Detects if running in Artillery environment and adjusts timeouts accordingly
 * @param {number} baseTimeout - Base timeout in milliseconds
 * @returns {number} - Adjusted timeout for environment
 */
export function getArtilleryAwareTimeout(baseTimeout) {
  const isArtilleryEnv = process.env.ARTILLERY_RUN || process.env.CI || process.env.CONTAINER_ENV;
  const multiplier = isArtilleryEnv ? 3.0 : 1.0; // 3x timeout for Artillery/CI environments
  const adjustedTimeout = Math.floor(baseTimeout * multiplier);
  
  if (isArtilleryEnv) {
    console.log(`🐌 Artillery environment detected: ${baseTimeout}ms -> ${adjustedTimeout}ms`);
  }
  
  return Math.min(adjustedTimeout, 300000); // Cap at 5 minutes
}

/**
 * Enhanced retry function with Artillery-aware error suppression and timeout scaling
 * @param {Function} operation - The operation to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @param {string} operationName - Name of the operation for logging (default: 'operation')
 * @param {Object} options - Additional options for retry behavior
 * @param {boolean} options.suppressIntermediateErrors - Don't log intermediate errors (default: false for Artillery)
 * @returns {Promise} - Result of the operation
 */
export async function performanceRetryWithBackoff(operation, maxRetries = 3, baseDelay = 1000, operationName = 'operation', options = {}) {
  const isArtilleryEnv = process.env.ARTILLERY_RUN || process.env.CI || process.env.CONTAINER_ENV;
  const suppressIntermediateErrors = options.suppressIntermediateErrors ?? isArtilleryEnv; // Default to true for Artillery
  
  let lastError = null;
  const errors = [];
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!suppressIntermediateErrors || attempt === 1) {
        console.log(`Attempting ${operationName} (attempt ${attempt}/${maxRetries})`);
      }
      const result = await operation();
      
      // Success after retries - log recovery if there were previous failures
      if (errors.length > 0 && !suppressIntermediateErrors) {
        console.log(`✅ ${operationName} succeeded after ${attempt} attempts`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      errors.push({ attempt, error: error.message, timestamp: new Date().toISOString() });
      
      if (attempt === maxRetries) {
        // Final attempt failed - always log this regardless of suppression setting
        console.error(`❌ ${operationName} failed after ${maxRetries} attempts:`, error.message);
        
        if (suppressIntermediateErrors && errors.length > 1) {
          console.error(`📋 Retry summary for ${operationName}:`, errors);
        }
        
        throw error;
      }
      
      // Calculate delay with jitter to avoid thundering herd in Artillery
      const jitter = Math.random() * 0.3; // 0-30% jitter
      const delay = Math.floor(baseDelay * Math.pow(2, attempt - 1) * (1 + jitter));
      
      if (!suppressIntermediateErrors) {
        console.log(`⚠️ ${operationName} failed (attempt ${attempt}), retrying in ${delay}ms...`);
        console.log(`   Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Dynamic timeout calculator with Artillery environment awareness
 * @param {number} baseTimeout - Base timeout in milliseconds
 * @param {number} loadFactor - Load factor multiplier (default: 1)
 * @returns {number} - Calculated timeout with Artillery scaling and appropriate cap
 */
export function performanceGetDynamicTimeout(baseTimeout, loadFactor = 1) {
  // First apply Artillery environment scaling
  const artilleryAwareTimeout = getArtilleryAwareTimeout(baseTimeout);
  
  // Then apply load factor
  const finalTimeout = artilleryAwareTimeout * (1 + loadFactor);
  
  // Cap at 5 minutes for Artillery, 2 minutes for local
  const isArtilleryEnv = process.env.ARTILLERY_RUN || process.env.CI || process.env.CONTAINER_ENV;
  const maxTimeout = isArtilleryEnv ? 300000 : 120000; // 5 min for Artillery, 2 min for local
  
  return Math.min(finalTimeout, maxTimeout);
}

/**
 * Enhanced element readiness checker for performance testing
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector to wait for
 * @param {Object} options - Options object with timeout and checkInterval
 * @returns {Promise} - Promise that resolves when element is ready
 */
export async function performanceWaitForElementReady(page, selector, options = {}) {
  const timeout = options.timeout || 60000;
  const checkInterval = options.checkInterval || 1000;
  
  return page.waitForFunction(
    (selector) => {
      const element = document.querySelector(selector);
      return element && element.offsetParent !== null && !element.disabled;
    },
    selector,
    { timeout, polling: checkInterval }
  );
}

/**
 * Enhanced staggered execution for concurrent user isolation
 * @param {number} maxDelay - Maximum delay in milliseconds (default: 5000)
 * @returns {Promise} - Promise that resolves after the stagger delay
 */
export async function performanceStaggerExecution(maxDelay = 5000) {
  const staggerDelay = Math.floor(Math.random() * maxDelay);
  console.log(`Staggering execution by ${staggerDelay}ms for user isolation`);
  await new Promise(resolve => setTimeout(resolve, staggerDelay));
}

/**
 * Generate unique identifier with process isolation for concurrent testing
 * @param {string} prefix - Prefix for the identifier (default: 'Test')
 * @returns {string} - Unique identifier string
 */
export function performanceGenerateUniqueId(prefix = 'Test') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  const processId = process.pid || Math.floor(Math.random() * 1000);
  return `${prefix} ${timestamp}_${random}_${processId}`;
}

/**
 * Helper function to create test files dynamically for upload tests
 * @returns {Object} - Object containing file paths and names
 */
export function createTestFiles() {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const currentDir = process.cwd();
  const platform = os.platform();
  console.log(`📁 Current working directory: ${currentDir}`);
  console.log(`🖥️ Platform detected: ${platform}`);
  
  // Create unique filenames to avoid conflicts
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  const fileName = `test_qawolf_${timestamp}_${randomSuffix}.pdf`;
  const newVersionFileName = `test_avatar_${timestamp}_${randomSuffix}.png`;
  
  // Create files in the exact paths the helper function expects
  // Platform-specific path handling
  let helperExpectedDir;
  if (platform === 'win32') {
    // Windows: Use C:\home\wolf\team-storage
    helperExpectedDir = 'C:\\home\\wolf\\team-storage';
  } else {
    // Linux/Container: Use /home/wolf/team-storage
    helperExpectedDir = '/home/wolf/team-storage';
  }
  
  console.log(`📁 Target directory for platform ${platform}: ${helperExpectedDir}`);
  
  if (!fs.existsSync(helperExpectedDir)) {
    fs.mkdirSync(helperExpectedDir, { recursive: true });
    console.log(`📁 Created helper expected directory: ${helperExpectedDir}`);
  }
  
  const pdfPath = path.join(helperExpectedDir, fileName);
  const pngPath = path.join(currentDir, newVersionFileName); // PNG in current dir for our file chooser
  
  console.log(`🆕 Creating unique test files:`);
  console.log(`   PDF: ${fileName} (in helper expected location)`);
  console.log(`   PNG: ${newVersionFileName} (in current dir)`);
  
  // Create minimal PDF content (simple PDF structure)
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
225
%%EOF`;

  // Create minimal PNG content (1x1 transparent PNG)
  const pngContent = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk header
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // Width: 1, Height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // Bit depth: 8, Color type: 6 (RGBA), CRC
    0x89, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41, // IDAT chunk header
    0x54, 0x08, 0x1D, 0x01, 0x00, 0x00, 0x00, 0x05, // IDAT data (compressed)
    0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, // IDAT data continued
    0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, // IEND chunk
    0x60, 0x82
  ]);
  
  try {
    // Write PDF file to helper expected location
    fs.writeFileSync(pdfPath, pdfContent);
    console.log(`✅ Created test PDF file: ${pdfPath}`);
    
    // Write PNG file to current directory
    fs.writeFileSync(pngPath, pngContent);
    console.log(`✅ Created test PNG file: ${pngPath}`);
    
    return { pdfPath, pngPath, fileName, newVersionFileName, helperExpectedDir };
  } catch (error) {
    console.error(`❌ Error creating test files: ${error.message}`);
    throw error;
  }
}

/**
 * Helper function to cleanup test files
 * @param {Array} filePaths - Array of file paths to cleanup
 * @param {string} helperExpectedDir - Directory to cleanup if empty
 */
export function cleanupTestFiles(filePaths, helperExpectedDir = null) {
  const fs = require('fs');
  const path = require('path');
  
  console.log(`🧹 Starting cleanup of ${filePaths.length} test files...`);
  filePaths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Successfully cleaned up test file: ${filePath}`);
      } else {
        console.log(`⚠️ Test file already removed or not found: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Could not cleanup file ${filePath}: ${error.message}`);
    }
  });
  
  // Clean up helper expected directory structure if it exists and is empty
  if (helperExpectedDir && fs.existsSync(helperExpectedDir)) {
    try {
      const files = fs.readdirSync(helperExpectedDir);
      if (files.length === 0) {
        fs.rmdirSync(helperExpectedDir);
        console.log(`🗑️ Cleaned up empty helper directory: ${helperExpectedDir}`);
        
        // Also try to clean up parent directories if they're empty
        const parentDir = path.dirname(helperExpectedDir); // C:\home\wolf
        if (fs.existsSync(parentDir)) {
          try {
            const parentFiles = fs.readdirSync(parentDir);
            if (parentFiles.length === 0) {
              fs.rmdirSync(parentDir);
              console.log(`🗑️ Cleaned up empty parent directory: ${parentDir}`);
              
              // Try to clean up C:\home if empty
              const grandParentDir = path.dirname(parentDir); // C:\home
              if (fs.existsSync(grandParentDir)) {
                try {
                  const grandParentFiles = fs.readdirSync(grandParentDir);
                  if (grandParentFiles.length === 0) {
                    fs.rmdirSync(grandParentDir);
                    console.log(`🗑️ Cleaned up empty grandparent directory: ${grandParentDir}`);
                  }
                } catch (error) {
                  console.log(`⚠️ Could not cleanup grandparent directory ${grandParentDir}: ${error.message}`);
                }
              }
            }
          } catch (error) {
            console.log(`⚠️ Could not cleanup parent directory ${parentDir}: ${error.message}`);
          }
        }
      } else {
        console.log(`⚠️ Helper directory not empty, keeping: ${helperExpectedDir}`);
      }
    } catch (error) {
      console.error(`❌ Could not cleanup helper directory ${helperExpectedDir}: ${error.message}`);
    }
  }
  
  console.log(`✅ Cleanup process completed`);
}

/**
 * Cross-platform file upload helper for test files stored in team-storage
 * Handles platform-specific path resolution and file upload with comprehensive logging
 * @param {Page} page - Playwright page object
 * @param {string} fileName - Name of the file to upload
 * @param {string} subPath - Subdirectory path within team-storage (e.g., 'Matter/Documents', 'checks', etc.)
 * @param {string} context - Description for logging purposes
 * @returns {Promise<string>} - Returns the resolved file path that was used
 */
export async function performanceUploadFileFromStorage(page, fileName, subPath = '', context = 'File Upload') {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  
  console.log(`🚀 [${context}] Starting cross-platform file upload for: ${fileName}`);
  
  // Detect platform and construct appropriate path
  const platform = os.platform();
  const isWindows = platform === 'win32';
  let filePath;
  
  if (isWindows) {
    // Windows: Use C:\home\wolf\team-storage
    filePath = path.join('C:', 'home', 'wolf', 'team-storage', subPath, fileName);
  } else {
    // Linux/Container: Use /home/wolf/team-storage
    filePath = path.join('/home', 'wolf', 'team-storage', subPath, fileName);
  }
  
  console.log(`🗂️ [${context}] Platform: ${platform}`);
  console.log(`📁 [${context}] Resolved file path: ${filePath}`);
  
  // Check if file exists and is accessible
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    console.log(`✅ [${context}] File exists and is readable`);
    
    // Get file stats for additional info
    const fileStats = fs.statSync(filePath);
    console.log(`📊 [${context}] File size: ${fileStats.size} bytes`);
    console.log(`📅 [${context}] File modified: ${fileStats.mtime}`);
    
  } catch (error) {
    console.error(`❌ [${context}] File not accessible: ${error.message}`);
    console.error(`📁 [${context}] Expected file location: ${filePath}`);
    console.error(`💻 [${context}] Platform detected: ${isWindows ? 'Windows' : 'Linux/Unix'}`);
    console.error(`🔍 [${context}] Troubleshooting steps:`);
    console.error(`   1. Verify file exists at exact path: ${filePath}`);
    console.error(`   2. Check file permissions (read access required)`);
    console.error(`   3. Ensure team-storage directory is properly mounted/accessible`);
    if (isWindows) {
      console.error(`   4. Windows: Verify C:\\home\\wolf\\team-storage path exists`);
      console.error(`   5. Windows: Check if path requires different drive mapping`);
    } else {
      console.error(`   4. Linux: Verify /home/wolf/team-storage path exists`);
      console.error(`   5. Linux: Check mount points and symbolic links`);
    }
    console.error(`⚠️ [${context}] Test will fail - file must exist at expected location`);
    throw new Error(`Required file not found: ${fileName} at ${filePath}. Test files must be present in team-storage.`);
  }
  
  // Set up file chooser handler
  console.log(`🎯 [${context}] Setting up file chooser handler...`);
  
  return new Promise((resolve, reject) => {
    page.once("filechooser", async (chooser) => {
      try {
        console.log(`📤 [${context}] File chooser triggered, uploading: ${filePath}`);
        await setFilesWithLogging(chooser, filePath, context);
        console.log(`✅ [${context}] File upload completed successfully`);
        resolve(filePath);
      } catch (err) {
        console.error(`❌ [${context}] File upload failed: ${err.message}`);
        reject(new Error(`File upload failed for ${fileName}: ${err.message}`));
      }
    });
    
    // Add a timeout to prevent hanging
    setTimeout(() => {
      reject(new Error(`Timeout: File chooser not triggered within 30 seconds for ${context}`));
    }, 30000);
  });
}

/**
 * Helper function to create dynamic download paths for different platforms
 * Ensures unique paths to avoid conflicts in Artillery workers and containers
 * @param {string} baseFileName - Base filename without extension
 * @returns {Object} - Object containing platform-appropriate download paths
 */
export function createDownloadPaths(baseFileName) {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const platform = os.platform();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  
  console.log(`📁 Creating download paths for: ${baseFileName}`);
  console.log(`🖥️ Platform detected: ${platform}`);
  console.log(`⏰ Timestamp: ${timestamp}`);
  console.log(`🔀 Random suffix: ${randomSuffix}`);
  
  let downloadDir;
  
  if (platform === 'win32') {
    // Windows: Use current directory temp folder
    downloadDir = path.join(process.cwd(), 'temp-downloads');
  } else {
    // Linux/Container: Use /tmp if available, otherwise current directory
    downloadDir = fs.existsSync('/tmp') ? '/tmp/test-downloads' : path.join(process.cwd(), 'temp-downloads');
  }
  
  console.log(`📂 Target download directory: ${downloadDir}`);
  
  // Ensure download directory exists
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
    console.log(`📁 Created download directory: ${downloadDir}`);
  }
  
  const csvPath = path.join(downloadDir, `${baseFileName}_${timestamp}_${randomSuffix}.csv`);
  const pdfPath = path.join(downloadDir, `${baseFileName}_${timestamp}_${randomSuffix}.pdf`);
  
  console.log(`🆕 Generated file paths:`);
  console.log(`   CSV: ${csvPath}`);
  console.log(`   PDF: ${pdfPath}`);
  
  return { 
    csvPath, 
    pdfPath, 
    downloadDir, 
    timestamp, 
    randomSuffix,
    baseFileName: `${baseFileName}_${timestamp}_${randomSuffix}`
  };
}

/**
 * Dynamic CSV content assertion utility with comprehensive logging
 * @param {string} csvPath - Path to CSV file
 * @param {Array} expectedContent - Array of strings to verify in CSV
 * @param {string} context - Context for debugging
 * @returns {Promise<boolean>} - Returns true if all content found
 */
export async function assertCSVContent(csvPath, expectedContent, context = 'CSV Assertion') {
  console.log(`\n📄 [${context}] Starting CSV content assertion`);
  console.log(`📁 [${context}] CSV path: ${csvPath}`);
  console.log(`🔍 [${context}] Expected content items: ${expectedContent.length}`);
  
  try {
    // Verify file exists
    const fs = await import('fs');
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    // Read CSV content
    const csvData = fs.readFileSync(csvPath, 'utf8');
    console.log(`📊 [${context}] CSV file size: ${csvData.length} characters`);
    console.log(`📄 [${context}] CSV preview (first 300 chars): ${csvData.substring(0, 300)}...`);
    
    // Verify each expected content item
    const missingContent = [];
    const foundContent = [];
    
    for (const expectedItem of expectedContent) {
      if (!csvData.includes(expectedItem)) {
        missingContent.push(expectedItem);
        console.error(`❌ [${context}] Missing content: "${expectedItem}"`);
      } else {
        foundContent.push(expectedItem);
        console.log(`✅ [${context}] Found content: "${expectedItem}"`);
      }
    }
    
    console.log(`📊 [${context}] Content verification summary:`);
    console.log(`   Found: ${foundContent.length}/${expectedContent.length} items`);
    console.log(`   Missing: ${missingContent.length} items`);
    
    if (missingContent.length > 0) {
      console.error(`❌ [${context}] Missing content details:`, missingContent);
      throw new Error(`Missing content in CSV: ${missingContent.join(', ')}`);
    }
    
    console.log(`🎉 [${context}] All CSV content assertions passed!`);
    return true;
    
  } catch (error) {
    console.error(`❌ [${context}] CSV assertion failed:`, error.message);
    throw error;
  }
}

/**
 * Dynamic PDF content assertion utility using pdf-parse library
 * @param {string} pdfPath - Path to PDF file
 * @param {Array} expectedContent - Array of strings to verify in PDF
 * @param {string} context - Context for debugging
 * @returns {Promise<boolean>} - Returns true if all content found
 */
export async function assertPDFContent(pdfPath, expectedContent, context = 'PDF Assertion') {
  console.log(`\n📄 [${context}] Starting PDF content assertion`);
  console.log(`📁 [${context}] PDF path: ${pdfPath}`);
  console.log(`🔍 [${context}] Expected content items: ${expectedContent.length}`);
  
  try {
    // Verify file exists
    const fs = await import('fs');
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }
    
    // Read PDF buffer
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`📊 [${context}] PDF file size: ${pdfBuffer.length} bytes`);
    
    // Import pdf-parse library
    const { PDFParse } = await import('pdf-parse');
    console.log(`📚 [${context}] PDF-parse library loaded successfully`);
    
    // Parse PDF content
    console.log(`🔄 [${context}] Starting PDF text extraction...`);
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    
    console.log(`📝 [${context}] Extracted text length: ${result.text.length} characters`);
    console.log(`📄 [${context}] Text preview (first 300 chars): ${result.text.substring(0, 300)}...`);
    
    // Normalize the PDF text by removing extra whitespace and line breaks for better matching
    const normalizedText = result.text
      .replace(/\s+/g, ' ')  // Replace multiple whitespace chars with single space
      .replace(/\n+/g, ' ')  // Replace line breaks with spaces
      .trim();               // Remove leading/trailing whitespace
    
    // Create a version with ALL whitespace removed for ultra-strict matching of fragmented content
    const ultraNormalizedText = result.text
      .replace(/\s/g, '')    // Remove ALL whitespace characters
      .replace(/\n/g, '');   // Remove ALL line breaks
    
    console.log(`🔧 [${context}] Normalized text preview (first 300 chars): ${normalizedText.substring(0, 300)}...`);
    console.log(`🔧 [${context}] Ultra-normalized text preview (first 200 chars): ${ultraNormalizedText.substring(0, 200)}...`);
    
    // Verify each expected content item
    const missingContent = [];
    const foundContent = [];
    
    for (const expectedItem of expectedContent) {
      // Normalize the expected item for comparison
      const normalizedExpected = expectedItem.toString().replace(/\s+/g, ' ').trim();
      
      // Try multiple search strategies
      let found = false;
      
      // Strategy 1: Direct match in normalized text
      if (normalizedText.includes(normalizedExpected)) {
        found = true;
      }
      
      // Strategy 2: Ultra-normalized match (removes ALL spaces) - for handling fragmented numbers/text
      if (!found) {
        const ultraNormalizedExpected = expectedItem.toString().replace(/\s/g, '');
        if (ultraNormalizedText.includes(ultraNormalizedExpected)) {
          found = true;
          console.log(`🔍 [${context}] Found via ultra-normalized match: "${expectedItem}"`);
        }
      }
      
      // Strategy 3: Fuzzy match - check if all words from expected item are present
      if (!found) {
        const expectedWords = normalizedExpected.split(' ').filter(word => word.length > 2); // Only significant words
        const allWordsFound = expectedWords.every(word => 
          normalizedText.toLowerCase().includes(word.toLowerCase())
        );
        if (allWordsFound && expectedWords.length > 0) {
          found = true;
          console.log(`🔍 [${context}] Found via fuzzy match: "${expectedItem}" (words: ${expectedWords.join(', ')})`);
        }
      }
      
      // Strategy 4: For numbers with dashes, try flexible pattern matching
      if (!found && /\d/.test(normalizedExpected)) {
        // Create a regex that allows any whitespace between digits and dashes
        const flexiblePattern = normalizedExpected
          .replace(/[\s-]/g, '\\s*[-\\s]*\\s*') // Allow spaces around dashes
          .replace(/(\d)/g, '$1\\s*'); // Allow spaces after digits
        const regex = new RegExp(flexiblePattern, 'i');
        if (regex.test(result.text)) {
          found = true;
          console.log(`🔢 [${context}] Found via flexible pattern match: "${expectedItem}"`);
        }
      }
      
      if (found) {
        foundContent.push(expectedItem);
        console.log(`✅ [${context}] Found content: "${expectedItem}"`);
      } else {
        missingContent.push(expectedItem);
        console.error(`❌ [${context}] Missing content: "${expectedItem}"`);
        
        // Additional debugging for missing content
        console.log(`🔍 [${context}] Debug info for "${expectedItem}":`);
        console.log(`   - Original expected: "${expectedItem}"`);
        console.log(`   - Normalized expected: "${normalizedExpected}"`);
        
        // Show part of the PDF text around potential matches
        const expectedLower = normalizedExpected.toLowerCase();
        const normalizedLower = normalizedText.toLowerCase();
        
        // Find partial matches
        const words = expectedLower.split(' ');
        for (const word of words) {
          if (word.length > 3) { // Only check significant words
            const wordIndex = normalizedLower.indexOf(word);
            if (wordIndex !== -1) {
              const start = Math.max(0, wordIndex - 20);
              const end = Math.min(normalizedLower.length, wordIndex + word.length + 20);
              const context = normalizedText.substring(start, end);
              console.log(`   - Partial match for "${word}" at position ${wordIndex}: "...${context}..."`);
            }
          }
        }
      }
    }
    
    console.log(`📊 [${context}] Content verification summary:`);
    console.log(`   Found: ${foundContent.length}/${expectedContent.length} items`);
    console.log(`   Missing: ${missingContent.length} items`);
    
    // Cleanup parser
    await parser.destroy();
    console.log(`🧹 [${context}] PDF parser cleaned up`);
    
    if (missingContent.length > 0) {
      console.error(`❌ [${context}] Missing content details:`, missingContent);
      throw new Error(`Missing content in PDF: ${missingContent.join(', ')}`);
    }
    
    console.log(`🎉 [${context}] All PDF content assertions passed!`);
    return true;
    
  } catch (error) {
    console.error(`❌ [${context}] PDF assertion failed:`, error.message);
    throw error;
  }
}

/**
 * Cleanup downloaded files from temporary locations with comprehensive logging
 * @param {Array} filePaths - Array of file paths to cleanup
 * @param {string} downloadDir - Download directory to cleanup if empty
 * @param {string} context - Context for debugging
 */
export function cleanupDownloadedFiles(filePaths, downloadDir = null, context = 'File Cleanup') {
  const fs = require('fs');
  
  console.log(`\n🧹 [${context}] Starting cleanup of ${filePaths.length} downloaded files...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  filePaths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        fs.unlinkSync(filePath);
        console.log(`🗑️ [${context}] Successfully cleaned up: ${filePath} (${stats.size} bytes)`);
        successCount++;
      } else {
        console.log(`⚠️ [${context}] File already removed or not found: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ [${context}] Could not cleanup file ${filePath}: ${error.message}`);
      errorCount++;
    }
  });
  
  // Clean up download directory if empty
  if (downloadDir && fs.existsSync(downloadDir)) {
    try {
      const files = fs.readdirSync(downloadDir);
      if (files.length === 0) {
        fs.rmdirSync(downloadDir);
        console.log(`🗑️ [${context}] Cleaned up empty directory: ${downloadDir}`);
      } else {
        console.log(`📁 [${context}] Directory not empty, preserving: ${downloadDir} (${files.length} files remaining)`);
      }
    } catch (error) {
      console.log(`⚠️ [${context}] Could not cleanup directory ${downloadDir}: ${error.message}`);
    }
  }
  
  console.log(`📊 [${context}] Cleanup summary: ${successCount} successful, ${errorCount} failed`);
}

/**
 * Helper function to create document template DOCX files dynamically for upload tests
 * Creates a valid DOCX file with template variables that will be replaced by the application
 * Follows the same pattern as createTestFiles() for cross-platform compatibility
 * @returns {Object} - Object containing file paths and names for template upload
 */
export function createDocumentTemplate() {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const currentDir = process.cwd();
  const platform = os.platform();
  console.log(`📁 Current working directory: ${currentDir}`);
  console.log(`🖥️ Platform detected: ${platform}`);
  
  // Create unique filename to avoid conflicts (following upload_a_document pattern)
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  const templateFileName = `Document-Template_${timestamp}_${randomSuffix}.docx`;
  
  // Platform-specific path handling (following upload_a_document.spec.js pattern)
  let helperExpectedDir;
  if (platform === 'win32') {
    // Windows: Use C:\home\wolf\team-storage\Matter\Documents
    helperExpectedDir = 'C:\\home\\wolf\\team-storage\\Matter\\Documents';
  } else {
    // Linux/Container: Use /home/wolf/team-storage/Matter/Documents
    helperExpectedDir = '/home/wolf/team-storage/Matter/Documents';
  }
  
  console.log(`📁 Target directory for platform ${platform}: ${helperExpectedDir}`);
  
  // Ensure directory exists with recursive creation
  if (!fs.existsSync(helperExpectedDir)) {
    fs.mkdirSync(helperExpectedDir, { recursive: true });
    console.log(`📁 Created helper expected directory: ${helperExpectedDir}`);
  }
  
  const templatePath = path.join(helperExpectedDir, templateFileName);
  
  console.log(`🆕 Creating document template DOCX file:`);
  console.log(`   Template: ${templateFileName}`);
  console.log(`   Path: ${templatePath}`);
  
  // Create minimal valid DOCX content as ZIP archive
  // DOCX files are ZIP archives containing XML files and relationships
  const createDocxBuffer = () => {
    // Main document XML with template variables that the application will replace
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
  <w:body>
    <w:p><w:r><w:t>\${FirmName}</w:t></w:r></w:p>
    <w:p><w:r><w:t>\${FirmAddress}</w:t></w:r></w:p>
    <w:p></w:p>
    <w:p><w:r><w:t>\${MatterCreationDate}</w:t></w:r></w:p>
    <w:p></w:p>
    <w:p><w:r><w:t>Re: \${MatterName}</w:t></w:r></w:p>
    <w:p></w:p>
    <w:p><w:r><w:t>Dear \${PrimaryClient},</w:t></w:r></w:p>
    <w:p></w:p>
    <w:p><w:r><w:t>Thank you for hiring us to represent as your \${PracticeArea} attorney. We look forward to working with you soon!</w:t></w:r></w:p>
    <w:p></w:p>
    <w:p><w:r><w:t>Sincerely,</w:t></w:r></w:p>
    <w:p></w:p>
    <w:p><w:r><w:t>\${AttorneyName}</w:t></w:r></w:p>
  </w:body>
</w:document>`;

    // Content Types XML (required for DOCX)
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    // Main relationships XML
    const mainRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    // Document relationships XML
    const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

    // Create ZIP file structure manually using Buffer operations
    // This is a simplified ZIP implementation for DOCX structure
    const zipEntries = [
      { name: '[Content_Types].xml', content: Buffer.from(contentTypesXml, 'utf8') },
      { name: '_rels/.rels', content: Buffer.from(mainRelsXml, 'utf8') },
      { name: 'word/document.xml', content: Buffer.from(documentXml, 'utf8') },
      { name: 'word/_rels/document.xml.rels', content: Buffer.from(documentRelsXml, 'utf8') }
    ];

    // Create a minimal ZIP structure
    // For production use, we'd use a proper ZIP library, but this creates a valid DOCX
    const centralDirectory = [];
    let currentOffset = 0;
    const fileData = [];

    zipEntries.forEach((entry, index) => {
      const filename = entry.name;
      const content = entry.content;
      
      // Local file header
      const localHeader = Buffer.alloc(30 + filename.length);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
      localHeader.writeUInt16LE(20, 4); // Version needed to extract
      localHeader.writeUInt16LE(0, 6); // General purpose bit flag
      localHeader.writeUInt16LE(0, 8); // Compression method (no compression)
      localHeader.writeUInt16LE(0, 10); // Last mod file time
      localHeader.writeUInt16LE(0, 12); // Last mod file date
      localHeader.writeUInt32LE(0, 14); // CRC-32 (simplified - using 0)
      localHeader.writeUInt32LE(content.length, 18); // Compressed size
      localHeader.writeUInt32LE(content.length, 22); // Uncompressed size
      localHeader.writeUInt16LE(filename.length, 26); // File name length
      localHeader.writeUInt16LE(0, 28); // Extra field length
      localHeader.write(filename, 30, 'utf8'); // File name
      
      fileData.push(localHeader, content);
      
      // Central directory entry
      const centralDirEntry = {
        offset: currentOffset,
        filename: filename,
        contentLength: content.length
      };
      centralDirectory.push(centralDirEntry);
      currentOffset += localHeader.length + content.length;
    });

    // Create central directory
    const centralDirData = [];
    centralDirectory.forEach(entry => {
      const centralHeader = Buffer.alloc(46 + entry.filename.length);
      centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
      centralHeader.writeUInt16LE(20, 4); // Version made by
      centralHeader.writeUInt16LE(20, 6); // Version needed to extract
      centralHeader.writeUInt16LE(0, 8); // General purpose bit flag
      centralHeader.writeUInt16LE(0, 10); // Compression method
      centralHeader.writeUInt16LE(0, 12); // Last mod file time
      centralHeader.writeUInt16LE(0, 14); // Last mod file date
      centralHeader.writeUInt32LE(0, 16); // CRC-32
      centralHeader.writeUInt32LE(entry.contentLength, 20); // Compressed size
      centralHeader.writeUInt32LE(entry.contentLength, 24); // Uncompressed size
      centralHeader.writeUInt16LE(entry.filename.length, 28); // File name length
      centralHeader.writeUInt16LE(0, 30); // Extra field length
      centralHeader.writeUInt16LE(0, 32); // File comment length
      centralHeader.writeUInt16LE(0, 34); // Disk number start
      centralHeader.writeUInt16LE(0, 36); // Internal file attributes
      centralHeader.writeUInt32LE(0, 38); // External file attributes
      centralHeader.writeUInt32LE(entry.offset, 42); // Relative offset of local header
      centralHeader.write(entry.filename, 46, 'utf8'); // File name
      
      centralDirData.push(centralHeader);
    });

    // End of central directory
    const endOfCentralDir = Buffer.alloc(22);
    endOfCentralDir.writeUInt32LE(0x06054b50, 0); // End of central dir signature
    endOfCentralDir.writeUInt16LE(0, 4); // Number of this disk
    endOfCentralDir.writeUInt16LE(0, 6); // Number of the disk with the start of the central directory
    endOfCentralDir.writeUInt16LE(centralDirectory.length, 8); // Total number of entries in the central directory on this disk
    endOfCentralDir.writeUInt16LE(centralDirectory.length, 10); // Total number of entries in the central directory
    
    const centralDirSize = centralDirData.reduce((sum, buf) => sum + buf.length, 0);
    endOfCentralDir.writeUInt32LE(centralDirSize, 12); // Size of the central directory
    endOfCentralDir.writeUInt32LE(currentOffset, 16); // Offset of start of central directory
    endOfCentralDir.writeUInt16LE(0, 20); // .ZIP file comment length

    // Combine all parts
    return Buffer.concat([...fileData, ...centralDirData, endOfCentralDir]);
  };

  try {
    // Create DOCX file content
    const docxBuffer = createDocxBuffer();
    
    // Write DOCX file to the target location
    fs.writeFileSync(templatePath, docxBuffer);
    console.log(`✅ Created document template DOCX file: ${templatePath}`);
    
    return { 
      templatePath, 
      templateFileName, 
      helperExpectedDir,
      fileName: templateFileName // For compatibility with existing test code
    };
  } catch (error) {
    console.error(`❌ Error creating document template: ${error.message}`);
    throw error;
  }
}


export async function performanceAddFileToMatter(page, fileName, mimeType, bufferContent) {
    // click upload
    console.log(`Started addDocumentToAMatter :: ${fileName}`);
    //await page.locator('//a[@data-bind="click: uploadDocuments"]//i[@class="zola-icon-download"]').click();
    await page.locator('//a[@data-bind="click: uploadDocuments"]//i[@class="zola-icon-download"]').click({ force: true });
    
    console.log(`Clicked uploadDocuments button :: ${fileName}`);
     page.once("filechooser", (chooser) => {
      chooser.setFiles([
        {
          name: fileName, // 👈 custom filename
          mimeType: mimeType,
          buffer: bufferContent,
        },
      ]).catch((err) => {
        console.error('Failed to set files:', err);
      });
    });
    console.log(`Click :: DocumentUploadDropzone :: ${fileName}`);
    await page.locator(`#DocumentUploadDropzone`).click({ force: true });

    console.log(`Waiting for Complete Upload button :: ${fileName}`);
    await page
        .locator(`#upload-documents-modal [data-bind*="click: uploadBulkDocuments"]`)
        .click({ force: true });
    
    console.log(`Waiting for upload to complete :: ${fileName}`);
    //await page.getByText('Complete Upload').waitFor();
    await page.getByText("Complete Upload", { exact: true }).waitFor();

    console.log(`Clicked Complete Upload button :: ${fileName}`);
    //await page.getByText('Complete Upload').click();
    await page.getByText("Complete Upload", { exact: true }).click({ force: true });

    console.log(`Document Added :: ${fileName}`);
    //await page.waitForTimeout(2000);
    await page.locator('.toast-success:has-text("Files uploaded successfully.")').waitFor({ state: 'detached', timeout: 15000 });
}


/** Validate summary for uploaded file */
export async function performanceVerifyDocumentSummary(page, displayName) {
    const docSelector = `//div[@class="documentNameInGridContainer"]//span[not(@data-dropdown-toggle)]//span[text()="${displayName}"]`;

    console.log(`Waiting for document in grid :: ${displayName}`);
    await expect(page.locator(docSelector)).toBeVisible({ timeout: 15000 });

    await page.locator(docSelector).hover({ force: true });

    await page.waitForLoadState("domcontentloaded");
    //await page.waitForTimeout(5000); // wait for hover actions to appear

    await page.locator('//div[text()="View Summary"]').first().click();
    await page.waitForTimeout(5000); // wait for hover actions to appear
 
    await expect(page.locator('//label[text()="Summary"]')).toBeVisible();
    await page.waitForTimeout(5000);
 
    await expect(page.locator('//div[@data-bind="text: summary"]')).toBeVisible();
    await page.waitForTimeout(5000);
    await page.locator('#document-list-metaview2 a').click();    
}


/**
 * Creates a PDF buffer for testing
 * @returns {Object} - Object containing buffer and mimeType
 */
export async function createPdfBuffer() {
const base64PdfContent =
    'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSID4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1szIDAgUl0vQ291bnQgMT4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNjEyIDc5Ml0vUGFyZW50IDIgMCBSL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDY0Pj4Kc3RyZWFtCkJUCjcwIDcwIFRkCihIZWxsbyBQZGYpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDY3IDAwMDAwIG4gCjAwMDAwMDAxMjEgMDAwMDAgbiAKMDAwMDAwMDE5NSAwMDAwMCBuIAowMDAwMDAwMzAwIDAwMDAwIG4gCnRyYWlsZXIKPDwvUm9vdCAxIDAgUi9TaXplIDYvSW5mbyA1IDAgUiA+PgpzdGFydHhyZWYKMzQ0CiUlRU9G';
    
  // Decode base64 to buffer
  const buffer = Buffer.from(base64PdfContent, 'base64');
    
  console.log(`✓ PDF Buffer created: ${buffer.length} bytes`);
    
  return{
        buffer,
        mimeType: 'application/pdf',
        extension: '.pdf'
      }
}

/**
 * Creates a DOCX buffer for testing
 * @returns {Object} - Object containing buffer and mimeType
 */
export async function createDocxBuffer() {
  const { Document, Packer, Paragraph, TextRun } = require('docx');

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          text: 'Test DOCX Document',
          bold: true,
          size: 32
        }),
        new Paragraph({
          text: 'This is a test DOCX created dynamically for upload testing.',
          size: 24
        }),
        new Paragraph({
          text: `Created on: ${new Date().toISOString()}`,
          size: 22
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  
  return {
    buffer,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx'
  };
}

/**
 * Creates a DOC buffer for testing (RTF format as legacy DOC)
 * @returns {Object} - Object containing buffer and mimeType
 */
export async function createDocBuffer() {
  const rtfContent = `{\\rtf1\\ansi\\ansicpg1252\\cocoartf2
\\*\\fromhtml1
{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}
{\\colortbl;\\red255\\green0\\blue0;}
{\\*\\expandedcolortbl;;}
\\margl1440\\margr1440\\margtsxn1440\\margbsxn1440\\mghdr720\\mgft720
\\vieww12240\\viewh15840\\viewkind0
\\pard\\tx720\\tx1440\\tx2160\\pardirnatural\\partightenfactor200

\\f0\\fs24 {\\*\\ltrmark Test DOC Document\\par}
This is a test DOC created dynamically for upload testing.\\par
Created on: ${new Date().toISOString()}\\par
}`;

  const buffer = Buffer.from(rtfContent, 'utf-8');
  
  return {
    buffer,
    mimeType: 'application/msword',
    extension: '.doc'
  };
}

/**
 * Creates an RTF buffer for testing
 * @returns {Object} - Object containing buffer and mimeType
 */
export async function createRtfBuffer() {
  const rtfContent = `{\\rtf1\\ansi\\ansicpg1252\\cocoartf2
\\*\\fromhtml1
{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}
{\\colortbl;\\red0\\green0\\blue0;}
{\\*\\expandedcolortbl;;}
\\margl1440\\margr1440\\margtsxn1440\\margbsxn1440\\mghdr720\\mgft720
\\vieww12240\\viewh15840\\viewkind0
\\pard\\tx720\\tx1440\\tx2160\\pardirnatural\\partightenfactor200

\\f0\\fs24 {\\*\\ltrmark Test RTF Document\\par}
This is a test RTF created dynamically for upload testing.\\par
Created on: ${new Date().toISOString()}\\par
}`;

  const buffer = Buffer.from(rtfContent, 'utf-8');
  
  return {
    buffer,
    mimeType: 'application/rtf',
    extension: '.rtf'
  };
}

/**
 * Creates a TXT buffer for testing
 * @returns {Object} - Object containing buffer and mimeType
 */
export async function createTxtBuffer() {
  const textContent = `Test TXT Document
This is a test TXT created dynamically for upload testing.
Created on: ${new Date().toISOString()}

Content Type: Plain Text
Format: UTF-8 Encoding`;

  const buffer = Buffer.from(textContent, 'utf-8');
  
  return {
    buffer,
    mimeType: 'text/plain',
    extension: '.txt'
  };
}

/**
 * Universal buffer creator - creates buffer based on file type
 * @param {string} fileType - Type of file to create (pdf, doc, docx, rtf, txt)
 * @returns {Object} - Object containing buffer and mimeType
 */
export async function createFileBuffer(fileType = 'pdf') {
  fileType = fileType.toLowerCase().replace(/\./g, '');
  
  console.log(`📄 Creating buffer for file type: ${fileType}`);
  
  try {
    switch(fileType) {
      case 'pdf':
        return await createPdfBuffer();
      case 'docx':
        return await createDocxBuffer();
      case 'doc':
        return await createDocBuffer();
      case 'rtf':
        return await createRtfBuffer();
      case 'txt':
        return await createTxtBuffer();
      default:
        console.warn(`Unknown file type: ${fileType}, defaulting to TXT`);
        return await createTxtBuffer();
    }
  } catch (error) {
    console.error(`❌ Error creating ${fileType} buffer: ${error.message}`);
    throw error;
  }
}

export async function performanceDeleteAccountByName(page, accountName) {
  try{
  // Navigate to the Accounting section
  await page.getByRole("link", { name: " Accounting" }).click();
  // wait for page to load
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3_000);
  await page.getByRole("link", { name: "Banks & Registers" }).click();
  await page.waitForLoadState("domcontentloaded");  // Ensure page is fully loaded
  console.log('  ✓ Navigated to Banks & Registers\n');
  console.log('🔍 clicking View Bank & Credit Card...');
  await page.getByRole('link', { name: 'View Bank & Credit Card' }).click();
  await page.waitForLoadState("domcontentloaded");  // Ensure page is fully loaded
  console.log('  ✓ Clicked View Bank & Credit Card\n');


  console.log(`Attempting delete: ${accountName}`);

    const allRows = page.locator('tr[id*="rdgAccList"]');

    const rowCount = await allRows.count();

    let firstMatchIndex = -1;

    // Find the FIRST VISIBLE ROW that contains the account name
    for (let i = 0; i < rowCount; i++) {
      const row = allRows.nth(i);
      const text = await row.innerText();

      if (text.includes(accountName)) {
        firstMatchIndex = i;
        console.log("------------------------");
        console.log(`text is ::: ${text}`)
        break;
      }
    }

    if (firstMatchIndex === -1) {
      console.warn(`⚠ No matching visible row for: ${accountName}`);
      return;
    }

    console.log(`Row found at index: ${firstMatchIndex}`);

    const row = allRows.nth(firstMatchIndex);

//    const row = rows.first();

    await Promise.all([
      page.waitForLoadState("networkidle"), // Wait for AJAX postback to finish
      row.locator('a.zola-icon-trash').first().click(),
    ]);

    // Now wait until text disappears from the entire table
    await expect(page.locator('table')).not.toContainText(accountName);

    console.log(`Deleted: ${accountName}`);
} catch (err) {
    console.error(`Error to delete account: ${accountName}`);
  }
}


export async function performancecleanUpCRMLead(page, identifer, options = {}) {
  
  // Navigate to CRM page only if not already there
  if (!page.url().includes('/CRM/')) {
    await page.locator(`#crm`).click();
    await page.waitForLoadState("domcontentloaded");
  }

  // Define all tabs to clean up in order
  const tabs = [
    { name: 'All Active', selector: '#BodyPlaceholder_LeadsUC_allActiveCount' },
    { name: 'Referred', selector: '#BodyPlaceholder_LeadsUC_btnReferred' },
    { name: 'Retained', selector: '#BodyPlaceholder_LeadsUC_btnRetained' },
    { name: 'Lost', selector: '#BodyPlaceholder_LeadsUC_btnRejectedLost' },
    { name: 'Junk', selector: '#BodyPlaceholder_LeadsUC_btnJunk' }
  ];

  // Loop through each tab and delete all leads with the identifier
  for (const tab of tabs) {
    console.log(`🔍 Checking ${tab.name} tab for leads with identifier: ${identifer}`);
    
    // Click on the tab
    await page.locator(tab.selector).click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000); // Wait for table to render

    // Check if any leads exist with the identifier
    if (
      await isVisible(
        page,
        `.rgMasterTable tbody tr:has-text("${identifer}")`,
        10000, // Increased timeout to 10 seconds
      )
    ) {
      let previousCount = 0;
      let currentCount = await page
        .locator(`.rgMasterTable tbody tr:has-text("${identifer}")`)
        .count();

      console.log(`✅ Found ${currentCount} lead(s) in ${tab.name} tab`);

      while (currentCount > 0) {
        // Break if no more leads or deletion didn't progress
        if (currentCount === 0 || currentCount === previousCount) break;

        previousCount = currentCount;

        let testRow = page
          .locator(`.rgMasterTable tbody tr:has-text("${identifer}")`)
          .first();
        await page.waitForTimeout(2000);

        // Click meatball menu
        await testRow.locator(`.lead-actions`).click();

        // Click delete lead
        await page.once("dialog", async (dialog) => await dialog.accept());
        await testRow.locator(`.fa-trash`).click();

        // Wait for deletion to process
        await page.waitForTimeout(3000);

        // Successful toast message
        await expect(
          page.locator(`.toast-success:has-text("Lead deleted successfully!")`),
        ).toBeVisible();
        await page
          .locator('.toast-success:has-text("Lead deleted successfully!")')
          .click();
        await expect(
          page.locator(`.toast-success:has-text("Lead deleted successfully!")`),
        ).not.toBeVisible();

        // Wait for table refresh between deletions
        await page.waitForTimeout(1000);

        // Update currentCount after deleting
        currentCount = await page
          .locator(`.rgMasterTable tbody tr:has-text("${identifer}")`)
          .count();
      }

      console.log(`✅ Deleted all leads from ${tab.name} tab`);
    } else {
      console.log(`ℹ️ No leads found in ${tab.name} tab`);
    }
  }

  // Return to All Active tab at the end
  console.log(`🏁 Cleanup complete for identifier: ${identifer}`);
  try {
    await page.locator(`#BodyPlaceholder_LeadsUC_allActiveCount`).click();
    await page.waitForLoadState("domcontentloaded");
  } catch (e) {
    console.error(e);
  }
}



export async function performanceAddTimeEntryToAMatterUpdated(page, timeEntry = {}) {
  const { dateFns, faker } = npmImports;

  console.log("DEBUG: Starting NewFuncAddTimeEntryToAMatter");

  // Get today date EST time
  const date = new Date();
  let todayEST = date.toLocaleString("en-US", { timeZone: "America/New_York" });
  todayEST = new Date(todayEST);

  // Populate time entry object with defaults if needed
  let givenWorkType = false;
  if (!timeEntry.date) timeEntry.date = dateFns.format(todayEST, "MM/dd/yyyy");
  if (!timeEntry.duration)
    timeEntry.duration = faker.datatype.number({ min: 1, max: 9 }).toString();
  if (!timeEntry.workType) {
    timeEntry.workType = "Court";
  } else {
    givenWorkType = true;
  }

  if (!timeEntry.narrative && !timeEntry.narrativeOverride)
    timeEntry.narrative = faker.lorem.sentence();
  if (!timeEntry.rate)
    timeEntry.rate = faker.datatype
      .number({ min: 10, max: 99, precision: 0.01 })
      .toString();

  console.log("DEBUG: Time entry defaults set");
  console.log(`  - Date: ${timeEntry.date}`);
  console.log(`  - Duration: ${timeEntry.duration}`);
  console.log(`  - Work Type: ${timeEntry.workType}`);
  console.log(`  - Rate: ${timeEntry.rate}`);

  // Click on the "Time/Expenses" tab
  console.log("DEBUG: Clicking Time/Expenses tab");
  await page.locator(`.rtsLI:has-text("Time/Expenses")`).click();

  // Click the plus icon in the section header
  console.log("DEBUG: Getting iframe and clicking add new time entry");
  const frame = await (await page.waitForSelector("#Iframe6")).contentFrame();

  
  await page.waitForLoadState("domcontentloaded");
  
  await frame.locator(`#add-new-time-entry`).click();

  // Fill out the inputs with the details object
  // -- Date
  console.log("DEBUG: Filling date field");
  await page.locator(`#te_duration [aria-label="select"]`).click();
  await page.locator(`#te_durDate`).fill(timeEntry.date);
  await page.keyboard.press("Enter");

  // -- Duration
  console.log("DEBUG: Filling duration field");
  await page.locator(`#te_durationVal`).fill(timeEntry.duration);

  // -- Charge
  console.log("DEBUG: Checking charge options");
  if (timeEntry.noCharge) {
    console.log("DEBUG: Checking no charge checkbox");
    await page.locator(`#chkNoCharge`).check();
  } else if (timeEntry.noChargeNoShow) {
    console.log("DEBUG: Checking no charge no show checkbox");
    await page
      .locator(`#duration-and-nocharge [data-bind="checked: isNcds"]`)
      .check();
  }

  if (timeEntry.defaultCheckboxes) {
    console.log("DEBUG: Resetting default checkboxes");
    // no charge check box
    const noChargecheckbox = page.locator("#chkNoCharge");
    // Uncheck the no charge checkbox if it is checked
    if (await noChargecheckbox.isChecked()) {
      await noChargecheckbox.uncheck();
    }
    // Locate the "No charge, Dont show" checkbox
    const noChargeDScheckbox = page.locator("#chkNCDS");

    // Uncheck the checkbox if it is checked
    if (await noChargeDScheckbox.isChecked()) {
      await noChargeDScheckbox.uncheck();
    }
  }

  // -- Work Type
  console.log(`DEBUG: Selecting work type: ${timeEntry.workType}`);
  await page.locator(`[id*="workTypes"] [id*="chosen"]`).click({timeout:3000});
  await page.keyboard.type(timeEntry.workType);
  await page.getByRole("option", { name: timeEntry.workType }).click();

  // -- Tasks
  if (timeEntry.tasks) {
    console.log(`DEBUG: Selecting task: ${timeEntry.tasks}`);
    await page.getByRole(`link`, { name: `-Type or Select-` }).click();
    await page.getByRole(`option`, { name: timeEntry.tasks }).click();
  }

  // -- Narrative (commented out as per original)
  // if (!timeEntry.narrativeOverride) {
  //   await page
  //     .getByRole('textbox', { name: 'NARRATIVE' })
  //     .fill(timeEntry.narrative);
  // }

  // -- Time Keeper
  if (timeEntry.timeKeeper) {
    console.log(`DEBUG: Selecting time keeper: ${timeEntry.timeKeeper}`);
    await page
      .locator(`label:has-text('Time Keeper') + .select2-container`)
      .click();
    await page.keyboard.type(timeEntry.timeKeeper);
    await page.getByRole("option", { name: timeEntry.timeKeeper }).click();
  }

  // -- Rate
  console.log(`DEBUG: Filling rate field: ${timeEntry.rate}`);
  await page.locator(`[data-bind="value: rate"]:visible`).fill(timeEntry.rate);

  // Click "Save & New"
  console.log("DEBUG: Clicking Save & New button");
  await page.locator(`#btnSaveNew`).click();

  // Close Time Entry Modal
  console.log("DEBUG: Closing time entry modal");
  await page
    .locator(`[aria-describedby="timeEntryForm"] [title="close"]`)
    .click();

  // Assert "Time Entry was added successfully!" toast notification is visible
  console.log("DEBUG: Waiting for success toast");
  try {
    await expect(
      page.locator(
        `.toast-success:has-text("Time Entry was added successfully!")`,
      ),
    ).toBeVisible({ timeout: 60000 });

    console.log("DEBUG: Toast text found, extracting");
    await page
      .locator(`.toast-success:has-text("Time Entry was added successfully!")`)
      .click();

    console.log("DEBUG: Waiting for toast to disappear");
    await expect(
      page.locator(
        `.toast-success:has-text("Time Entry was added successfully!")`,
      ),
    ).not.toBeVisible({ timeout: 10000 });

    console.log("DEBUG: Toast disappeared successfully");
  } catch (error) {
    console.error("DEBUG: Toast assertion failed:", error.message);

    // Check for error toast
    try {
      const errorToast = await page
        .locator(`.toast-danger, .toast-error`)
        .innerText();
      console.error("DEBUG: Error toast message:", errorToast);
    } catch (e) {
      console.error("DEBUG: No error toast found");
    }

    // Check page content for debugging
    try {
      const pageText = await page.locator("body").innerText();
      console.log(
        "DEBUG: Page content (first 500 chars):",
        pageText.substring(0, 500),
      );
    } catch (e) {
      console.error("DEBUG: Could not retrieve page content");
    }

    // Check for any visible toasts
    try {
      const allToasts = await page
        .locator(
          `.toast-success, .toast-danger, .toast-error, .toast-warning`,
        )
        .all();
      console.log("DEBUG: Found", allToasts.length, "toast elements on page");
    } catch (e) {
      console.error("DEBUG: Could not check for toasts");
    }

    throw error;
  }

  // Calculate total
  const total = (+timeEntry.duration * +timeEntry.rate)
    .toFixed(2)
    .toString();
  timeEntry.total = total;

  console.log("DEBUG: Time entry creation completed successfully");
  console.log(`  - Calculated total: ${total}`);

  return timeEntry;
}

export function createDownloadPaths2(fileName) {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const platform = os.platform();
  //const timestamp = Date.now();
  //const randomSuffix = Math.random().toString(36).substr(2, 9);
  
  console.log(`📁 Creating download paths for: ${fileName}`);
  console.log(`🖥️ Platform detected: ${platform}`);
  //console.log(`⏰ Timestamp: ${timestamp}`);
  //console.log(`🔀 Random suffix: ${randomSuffix}`);
  
  let downloadDir;
  
  if (platform === 'win32') {
    // Windows: Use current directory temp folder
    downloadDir = path.join(process.cwd(), 'temp-downloads');
  } else {
    // Linux/Container: Use /tmp if available, otherwise current directory
    downloadDir = fs.existsSync('/tmp') ? '/tmp/test-downloads' : path.join(process.cwd(), 'temp-downloads');
  }
  
  console.log(`📂 Target download directory: ${downloadDir}`);
  
  // Ensure download directory exists
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
    console.log(`📁 Created download directory: ${downloadDir}`);
  }
  
  const csvFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  const pdfFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const csvPath = path.join(downloadDir, csvFileName);
  const pdfPath = path.join(downloadDir, pdfFileName);

  console.log(`🆕 Generated file paths:`);
  console.log(`   CSV: ${csvPath}`);
  console.log(`   PDF: ${pdfPath}`);
  
  return { 
    csvPath, 
    pdfPath, 
    downloadDir, 
    //timestamp, 
    //randomSuffix,
    fileName: `${fileName}`
  };
}

export async function goToMatter_new(page, matterName) {
 
  // Navigate to matter dashboard
  await page.locator(`#navigation [href="/Matters/MatterList2.aspx"]`).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000); // wait for table to load
 
  // Search for matter name
  await page.locator(`#page-search`).fill(matterName);
  await page.keyboard.press("Enter");
  await page.waitForLoadState("domcontentloaded"); // 15
  await page.waitForTimeout(10_000);
 
  // Wait until loading overlay is no longer visible
  try{
    await page.waitForSelector("#matter-view-loading-overlay", {
      state: "hidden",
      timeout: 60 * 1000,
    });
  } catch(err){
    console.error("🛑 Retrying ::: #matter-view-loading-overlay overlay did not disappear ....");
    await page.waitForSelector("#matter-view-loading-overlay", {
      state: "hidden",
      timeout: 60 * 1000,
    });
  }

  await page.waitForTimeout(2000); // extra wait to ensure table is ready
  // Navigate to matter
  // await page.locator(`//td[text()="${matterName}"]/../td[2]`).first().click();
  const cell = page.locator(`//tr[td[normalize-space()="${matterName}"]]//td[2]`);
  await cell.waitFor({ state: "visible", timeout: 60000 });
  await cell.click();

  await page.waitForLoadState("domcontentloaded", { timeout: 120000 });
 
  // Wait again to ensure the page is fully loaded
  try{
    await page.waitForSelector("#matter-view-loading-overlay", {
      state: "hidden",
    });
  } catch(err){
    console.error("🛑 Retrying ::: #matter-view-loading-overlay overlay to be hidden ....");
    await page.waitForTimeout(5000);
    await page.waitForSelector("#matter-view-loading-overlay", {
      state: "hidden",
    });
  };
}


export async function performanceDeleteTimeEntry(page, description) {
  console.log("Deleting the created time entry...");
  page.once('dialog', (dialog) => {
    dialog.accept().catch(error => {
        console.error('Failed to accept the dialog:', error);
    });
  });
  console.log("Clicking the delete icon...");
  await page
    .locator(`[role="rowgroup"] tr:has-text("${description}") .fa-trash`)
    .click();
  await page.waitForTimeout(2000);
  console.log("Time entry deleted.");
}



export async function performanceCreateCalendarEvent2(page, evnt = {}) {
  if (!evnt.subject) {
    throw new Error(`🛑 Event must have a Subject 🛑`);
  }

   //--------------------------------
// Act:
//--------------------------------

// create a calendar event with the specified information
console.log(`Creating calendar event with subject`);

// Wait for the calendar event creation modal to be visible
try {
  console.log("Waiting for calendar event creation modal to open...");
  await page.locator(`#add-calendar-entry`).waitFor({ state: 'visible', timeout: 15000 });
  await page.locator(`#add-calendar-entry`).click();
  
  // Wait for dropdown to appear
  await page.locator(`.drp-down-option:has-text("Create New Event")`).waitFor({ state: 'visible', timeout: 15000 });
  await page.locator(`.drp-down-option:has-text("Create New Event")`).click();
  
  // Wait for the subject input to be fully visible and ready
  console.log("Waiting for event subject input field to be visible...");
  await page.locator(`.event-entry-subject`).waitFor({ state: 'visible', timeout: 40000 });
  await page.waitForTimeout(1000); // Extra wait for modal animation
  
  
  // -- location
  if (evnt.location && evnt.city) {
    await page.locator(`#event-entry-location-input`).fill(evnt.location);
    await page
      .locator(
        `.pac-item:has-text("${evnt.location}") span:has-text("${evnt.city}")`,
      )
      .click();
  }

  // -- Date
  if (evnt.date) {
    await page.locator(`[data-bind="iCheck: isAllDay"] ins`).click(); // click all day
    await page.locator(".k-select:visible").first().click();
    await page.locator(`[title="${evnt.date}"]:visible`).first().click();

    // -- End Date
    await page.locator(".k-select:visible").nth(1).click();
    await page.locator(`[title="${evnt.date}"]:visible`).first().click();
  } else if (evnt.dateFrom || evnt.dateTo) {
    await page.locator(`#event-entry-kdtp-from`).fill(evnt.dateFrom);
    await page.waitForTimeout(2500);
    await page.locator(`.event-entry-subject`).click();
    await page.waitForTimeout(2500);
    await page.locator(`#event-entry-kdtp-to`).fill(evnt.dateTo);
    await page.mouse.click(0, 0);
  }

  // -- Description
  if (evnt.description) {
    await page
      .locator(`[aria-label="Rich Text Editor, calendar-event-description"]`)
      .fill(evnt.description);
  }

  // -- Event Owner and attendee
  if (evnt.owner || evnt.attendee) {
    await page
      .locator(
        `[aria-describedby="event-entry-modal"] label:has-text("Event Owner") + div`,
      )
      .click();
    await page.getByRole("option", { name: evnt.owner }).click();

    await page.locator(`[id*=addAttendeeUserSelect]`).first().click();
    await page.getByRole("option", { name: evnt.attendee }).click();
  }

  // Matter
  if (evnt.matter) {
    await page
      .locator(`.event-entry-pane-right-right .select2-default`)
      .click();
    await page.keyboard.type(evnt.matter);
    await page.locator(`#select2-drop :text('${evnt.matter}')`).click();
  }

  // Lead
  if (evnt.lead) {
    await page
      .locator(`.event-entry-pane-right-right .select2-default`)
      .click();
    await page.keyboard.type(evnt.lead);
    await page.locator(`#select2-drop :text('${evnt.lead}')`).click();
  }

  // Reminder (object) ( mode = text / notif / email ) | ( interval = min / days / weeks / months )
  if (evnt.reminder) {
    await page.locator(`[data-bind="click: addReminder"]`).click();

    if (evnt.reminder.number) {
      await page
        .locator(`.event-entry-input-reminderQuantity`)
        .fill(`${evnt.reminder.number}`);
    }
    if (evnt.reminder.mode) {
      await page
        .locator(
          `.event-reminder-type-switcher:has-text('${evnt.reminder.mode}')`,
        )
        .click();
    }
    if (evnt.reminder.interval) {
      await page
        .locator(
          `.event-reminder-value-type-switcher:has-text('${evnt.reminder.interval}')`,
        )
        .click();
    }
  }

  if (!evnt.dontSave) {
    // Click "Save"
    await page.locator(`#event-entry-save-button`).click();

    // ignore date conflict if exists
    try {
      await page
        .locator(`#event-date-conflict-modal-ok`)
        .click({ timeout: 1000 });
    } catch (e) {
      //console.error(e);
    }

    if (!evnt.dontCheck) {
      // success message should appear
      await expect(await page.getByText(`New Event was added`)).toBeVisible({
        timeout: 2 * 30 * 1000, // can take a while
      });
      console.log("checking checking checking");
      await expect(page.getByText(`New Event was added`)).not.toBeVisible();
    }
  }
  console.log("Calendar event creation modal processed successfully.");

}
  
 catch (error) {
  console.error("🛑 Failed to create calendar event:", error.message);
  throw new Error("Calendar event creation modal failed to open");
}

// //--------------------------------
// // Assert:
// //--------------------------------

// // success message should appear
// await expect(page.locator(`.toast-success:has-text("New Event was added successfully!")`)).toBeVisible({
//   timeout: 2 * 30 * 1000 // can take a while
// });

// // success message should disappear
// await expect(page.locator(`.toast-success:has-text("New Event was added successfully!")`)).not.toBeVisible();

 }
  
export async function performanceInvoiceMatter2(page, matter, options = {}) {
  const { dateFns } = npmImports;
  const { stayOnPage = false } = options;
  // Click on the "Time/Expenses" tab
  await page.locator(`.rtsLI:has-text("Time/Expenses")`).click();

  // grab iframe
  let frame = await (await page.waitForSelector("#Iframe6")).contentFrame();

  // Click on the "Time Entries" section
  await frame.locator(`a#time-entries`).click();

  // Click the "Invoice Unbilled Activities" icon
  await frame.locator(`a#openUnbilledInvoicesBtn`).click();

  await page.waitForLoadState("domcontentloaded");

  await page.waitForTimeout(12_000);

// Select "Manually select Items"
try {
  await page
    .getByRole(`radio`, { name: `Manually select Items` })
    .click({ timeout: getArtilleryAwareTimeout(8000) });
  console.log("✅ Successfully selected 'Manually select Items' radio button");
} catch (error) {
  console.warn(" Manually select Items' radio button not visible:", error.message);
  // Continue execution without failing
}

  // check all & generate invoice
  //await page.waitForLoadState("domcontentloaded");
  //await page.waitForTimeout(8_000);
  await page.waitForLoadState("domcontentloaded");

 // await page.locator(`#hoursrange`).click();
 // await page.getByRole(`listitem`).filter({ hasText: `Today` }).first().click();
  await page.locator(`#hoursrange`).click();
  await page.getByRole(`listitem`).filter({ hasText: `Show All` }).click();
  await page.waitForTimeout(4_000);
  await page.locator(`#chkToggleAll`).click();

  //await page.getByRole(`button`, { name: `Generate Invoice` }).click();

  const generateInvoiceBtn = page.getByRole('button', { name: 'Generate Invoice' });
  await page.locator('#searching-overlay').waitFor({
    state: 'hidden',
    timeout: 30000
  });
  await expect(generateInvoiceBtn).toBeEnabled({ timeout: 30000 });
  await generateInvoiceBtn.click();	
	
  if (options.invoiceDate) {
    let days = options.invoiceDate;
    await page
      .locator(`label:has-text("Invoice Date") + .k-datepicker input`)
      .fill(days);
    await page.mouse.click(0, 0);
    await page.waitForTimeout(2_000);
  }
  if (options.dueDate) {
    let days = options.dueDate;
    let date = dateFns.format(
      new Date().setDate(new Date().getDate() + days),
      "MM/dd/yyyy",
    );
    await page
      .locator(`label:has-text("Due Date") + .k-datepicker input`)
      .fill(date);
    await page.mouse.click(0, 0);
  }
  if (options.pastDueDate) {
    let days = options.pastDueDate;
    await page
      .locator(`label:has-text("Due Date") + .k-datepicker input`)
      .click();
    await page
      .locator(`label:has-text("Due Date") + .k-datepicker input`)
      .fill(days);
    await page.mouse.click(0, 0);
  }

  await page.waitForTimeout(5000);

  //await page
  //  .getByLabel(`Generate Invoice`)
  //  .getByText(`Generate`, { exact: true })
  //  .click();
  
  await page.getByLabel('Generate Invoice').waitFor();
  const btn = page.getByLabel('Generate Invoice');
  // // Wait until button becomes enabled
  await expect(btn).toBeEnabled({ timeout: 30000 });
  // // Click
  await btn.getByText('Generate', { exact: true }).click();
  
  await expect(
    page.locator(`.toast-success:has-text("Generated invoices: ")`),
  ).toBeVisible();
  let splitInvoice = await page.locator(`.toast-success`).innerText();
  let invoiceNo = splitInvoice.split(": ")[1];
  
  // Wait for the toast to disappear
  await expect(
    page.locator(`.toast-success:has-text("Generated invoices: ")`),
  ).not.toBeVisible({ timeout: 10000 });

  if (stayOnPage === true) {
    await page.goBack();
    await page.waitForLoadState("domcontentloaded");
    // Click on the "Invoices" tab
    await page.locator(`.rtsLI:has-text("Invoices")`).click();
    return { invoiceNo: invoiceNo.replace(/\.$/, "") };
  }

  // Click on the "Invoices" tab
  await page.locator(`.rtsLI:has-text("Invoices")`).click();

  return { invoiceNo: invoiceNo.replace(/\.$/, "") };
}

/**
 * A highly resilient search function that retries the entire search flow if results don't appear.
 * @param {string} searchBarLocator - The selector (CSS/XPath) for the search input.
 * @param {string} searchTerm - The text to type and verify in the results.
 * @param {string} searchBtnName - The exact label of the search button (e.g., 'SEARCH').
 */
export async function performanceSearchFunction(page, searchInput,searchTerm,searchBtnName) {
  await expect(async () => {
    //Fill search bar
    const searchBar = page.locator(searchInput);
    await searchBar.click();
    await searchBar.fill(searchTerm);
    await page.waitForTimeout(1000);
    //Trigger Search
    const searchBtn = page.getByRole("button", { name: searchBtnName, exact: true });
    await searchBtn.hover();
    await searchBtn.click({ force: true });
    await page.waitForLoadState()
    await page.waitForTimeout(3000);
    console.log('DEBUG: Grid Not Displayed retrying..Searching '+searchTerm);
    await page.getByRole("gridcell", { name: new RegExp(searchTerm) }).first()
    .waitFor({ state: "visible" });
    console.log('DEBUG: Grid Displayed for '+searchTerm);
  }).toPass({
    timeout: 8 * 60 * 1000, // 8 minute total timeout
  });
}
 


export async function logMemory(memoryUsage) {
  const mem = process.memoryUsage();
  console.log(`${memoryUsage} | RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
}