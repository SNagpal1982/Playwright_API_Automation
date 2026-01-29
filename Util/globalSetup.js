import { browser, chromium } from '@playwright/test';
import fs from 'fs';

const AUTH_FILE = 'storageState/auth.json';

export default async function globalSetup() {
    // If auth state already exists, skip login
    if (fs.existsSync(AUTH_FILE)) {
        console.log('[globalSetup] Auth state already exists. Skipping UI login.');
        return;
    }
    const baseURL = "https://qa.zolastaging.com";
    const username = "performance.tester.1@mailinator.com";
    const password = "Success123";
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('[globalSetup] Doing UI login and saving storageState...');

    //Open Caret Legal Website
    await page.goto(`${baseURL}`);
    // Fill login form
    await page.waitForLoadState('networkidle');
    await page.locator('input#txtUserName').fill(username);
    await page.locator('input#txtPwd').fill(password);
    await page.locator('#loginBtn').click();

    // Wait for the CARET Legal logo to ensure stable login state
    await page.getByRole('img', { name: 'CARET Legal' }).waitFor();

    // Save cookies + localStorage etc.
    await context.storageState({ path: AUTH_FILE });
    await browser.close();
    console.log('[globalSetup] storageState saved at:', AUTH_FILE);
}