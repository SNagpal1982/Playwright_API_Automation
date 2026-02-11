import { assert, expect, test, getInbox, launch, dotenv, saveTrace, faker, dateFns, twilio, StreamZip, axios, xlsx, jsQR, pngjs } from '../qawHelpers';

// log in
const { page } = await logIn({ 
args: [
    "--disable-web-security",
    "--ignore-certificate-errors",
    "--disable-blink-features=AutomationControlled",
  ],
  bypassCSP: true,
  ignoreHTTPSErrors: true,
  userAgent: process.env.USER_AGENT, });


// go to task page
await page.locator(`#tasks a`).click();
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(3000);

let row = 0;
let attempts = 0;

// click into ALL
await page.locator(`#All`).click();

// check if task is visible
if (await isVisible(page, `#listcontent .super-task-container:visible`, 4000)) {
  while (
    attempts < 50 &&
    (await page.locator(`#listcontent .super-task-container:visible`).count()) >
      0
  ) {
    try {
      // give time to load
      await page.waitForTimeout(2000);

        if ( await isVisible(page,`.generic-confirm-modal-wrapper`,1000)){
        await page.getByRole(`link`, { name: `DELETE` }).click();
        
      }

      await page.waitForTimeout(5_000);

      await page.locator(`.tasks-rfrsh-btn`).first().click();

      // grab first delete row
      const deleteRow = page
        .locator(`#listcontent .super-task-container:visible`)
        .nth(row);

      await deleteRow.locator(`.task-actions-button`).click();

      await deleteRow.locator(`.dropdown-menu li:has-text("Delete")`).click();

      // check if we need to complete first
      if (
        await isVisible(
          page,
          `[role="dialog"] div:has-text("This task was created by a still active automated workflow and cannot be deleted at this time.")`,
          1000,
        )
      ) {
        // click ok
        await page.getByRole("button", { name: "OK" }).click();

        await handleCancelWorkflowTask(page)

        await page.bringToFront()

        await page.waitForTimeout(5_000)

      } else {
        if (await isVisible(page, `.recurring-task-dialog`, 1000)) {
          // if recurring event
          await page.locator(`[data-bind="click: deleteSingleTask"]`).click();
        } else {
          // Click delete in modal
          try {
            await page.getByRole(`button`, { name: `Delete` }).click({timeout: 1000});
          }catch{

          await page.getByRole(`link`, { name: `DELETE` }).click();
          }
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
        ).not.toBeVisible();
      }
      attempts++;
    } catch {
      row++;
      attempts++;
      continue;
    }
  }
}

// / go to task page
await page.locator(`#tasks a`).click();
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(3000);

row = 0;
attempts = 0;

// click into ALL
await page.locator(`#Completed`).click();

// check if task is visible
if (await isVisible(page, `#listcontent .super-task-container:visible`, 4000)) {
  while (
    attempts < 50 &&
    (await page.locator(`#listcontent .super-task-container:visible`).count()) >
      0
  ) {
    try {
      // give time to load
      await page.waitForTimeout(2000);

   if (
        await isVisible(
          page,
          `.generic-confirm-modal-wrapper`,
          1000,
        )
      ){
        await page.getByRole(`link`, { name: `DELETE` }).click();
      }
      await page.waitForTimeout(5_000);

      await page.locator(`.tasks-rfrsh-btn`).first().click();

      // grab first delete row
      const deleteRow = page
        .locator(`#listcontent .super-task-container:visible`)
        .nth(row);

      await deleteRow.locator(`.task-actions-button`).click();

      await deleteRow.locator(`.dropdown-menu li:has-text("Delete")`).click();

      // check if we need to complete first
      if (
        await isVisible(
          page,
          `[role="dialog"] div:has-text("This task was created by a still active automated workflow and cannot be deleted at this time.")`,
          1000,
        )
      ) {
        // click ok
        await page.getByRole("button", { name: "OK" }).click();

        await handleCancelWorkflowTask(page)

        await page.bringToFront()

        await page.waitForTimeout(5_000)
      } else {
        if (await isVisible(page, `.recurring-task-dialog`, 1000)) {
          // if recurring event
          await page.locator(`[data-bind="click: deleteSingleTask"]`).click();
        } else {
          // Click delete in modal
          await page.getByRole("button", { name: "Delete" }).click();
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
        ).not.toBeVisible();
      }

      
      attempts++;
    } catch {
      row++;
      attempts++;
      continue;
    }
  }
}
