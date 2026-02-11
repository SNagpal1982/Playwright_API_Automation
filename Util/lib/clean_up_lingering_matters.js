import { assert, expect, test, getInbox, launch, dotenv, saveTrace, faker, dateFns, twilio, StreamZip, axios, xlsx, jsQR, pngjs } from '../qawHelpers';

// Login to CARET Legal
const { page } = await logIn();

// open matter page
await page.locator(`#matters a`).click();
await page.waitForLoadState("domcontentloaded")
await page.waitForTimeout(2000);

// Accept all dialogs
page.on('dialog', async (dialog) => await dialog.accept());


if ( await isVisible( page, `table .matter-grid-row:has-text("Pawnee Parks and Recreation")`, 5000)
  ) {
    // clean up all instances of matter by name
    while ( await page.locator(`table .matter-grid-row:has-text("Pawnee Parks and Recreation")`).count()) {

      // click delete
      await page
        .locator(
          `table .matter-grid-row:has-text("Pawnee Parks and Recreation") .zola-icon-trash`
        )
        .first()
        .click();
      await expect(page.locator(`.toast-success:has-text("Matter successfully deleted")`)).toBeVisible()
      await page.locator(`.toast-success:has-text("Matter successfully deleted")`).click()
      await expect(page.locator(`.toast-success:has-text("Matter successfully deleted")`)).not.toBeVisible()
      await expect(page.locator(`div#matter-view-loading-overlay-child img`)).not.toBeVisible();
    }
  }
