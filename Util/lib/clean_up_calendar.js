import { assert, expect, test, getInbox, launch, dotenv, saveTrace, faker, dateFns, twilio, StreamZip, axios, xlsx, jsQR, pngjs } from '../qawHelpers';

export async function cleanUpCalendarForWorkflows (page, eventName) {
    await page.locator(`#page-search`).click();
    await page.keyboard.type(eventName, { delay: 100 });
    await page.keyboard.press("Enter");
    if (
      await isVisible(
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

        if ( await isVisible(page, `#generic-confirm-modal p p:has-text("The event can be deleted once the workflow is complete.")`, 1000)) {
          await handleCancelWorkflow(page)

          await page.locator(`.calendar-search-result-item a`).first().click();
          await page.locator(`#event-entry-modal .btn-danger`).click();
          await page.locator(`#generic-confirm-modal a:has-text("Delete")`).click();
        } else {
          await page.locator(`#generic-confirm-modal a:has-text("Delete")`).click();
          await page.waitForTimeout(2000);
        }
      }
    }
    await expect(
      page.locator(
        `.calendar-search-result-grid-empty:has-text("There are no events that match your search")`,
      ),
    ).toBeVisible();
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// log in
const { page } = await logIn(
  { 
  email: process.env.THIRD_USER,
  slowMo: 1200,
  password: process.env.THIRD_USER_PASSWORD
  }
);

// Array for Calendar Events
const events = [
  "Parent Event",
  "Parent Appointment",
  "Dependent Event",
  "Holiday",
  "WF runs correctly",
  "Generic Event",
  "WF Temp Event",
  "Event Test",
  "Event 1"
]

await page.locator(`#calendar [href="/Calendar/Calendar.aspx"]`).click();
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(2000);

for (let event of events) {

  // clean up calendar event by name
  await cleanUpCalendarForWorkflows(page, event)

  // go back to calendar view
  await page.locator(`[data-bind="click: hideEventSearch"]`).click();

  // clear search
  await page.locator(`[onclick="CalendarMVM.calendarSearchGridVM.clearSearch(); clearCalendarPageSearch();"]`).click();

  // click refresh
  await page.locator(`.refresh`).click();

  // give some time before next search
  await page.waitForTimeout(2000)
}
