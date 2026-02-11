import { assert, expect, test, getInbox, launch, dotenv, saveTrace, faker, dateFns, twilio, StreamZip, axios, xlsx, jsQR, pngjs } from '../qawHelpers';

//--------------------------------
// Arrange:
//--------------------------------
// / Below is an array for urls. Please add any pages you want to visit to this array.
// Below is an array for locators. Please add any locators you want to visit to this array.

const { page } = await logIn({
  slowMo: 3000,
});
const locators = [
  // Dashboard
  page.getByRole(`link`, { name: ` Dashboard` }),
  // email
  page.locator(`#email a`),
  // crm
  page.getByRole(`link`, { name: ` CRM` }),
  // matters
  page.getByRole(`link`, { name: ` Matters` }),
  // calendar
  page.locator(`#calendar a`),
  // contacts
  page.getByRole(`link`, { name: ` Contacts` }),
  // tasks
  page.getByRole(`link`, { name: ` Tasks` }),
  // documents
  page.getByRole(`link`, { name: ` Tasks` }),
  // time
  page.getByRole(`link`, { name: ` Time` }),
  // accounting
  page.getByRole(`link`, { name: ` Accounting` }),

];

//--------------------------------
// Act:
//--------------------------------
for (let locator of locators) {
  try {
    // Use the locator's click method
    await locator.click();
    
    // Wait for the page to load, wait 30 seconds
    await page.waitForLoadState("domcontentloaded", {
      timeout: 1 * 30 * 1000, 
    });

   // wait 20 seconds
    await page.waitForTimeout(20 * 1 * 1000)
    
    // Log the tab details that was clicked on
    console.log(`Successfully clicked on the element: ${await locator.evaluate(el => el.outerHTML)}`);
  } catch (error) {
    // Log if it fails to click on a tab link
    console.error(
      `Error clicking on the element: ${await locator.evaluate(el => el.outerHTML)}\n`,
      error
    );
    throw error; 
  }
}
// bring to front
await page.bringToFront()

// click on firm profile
await page.getByRole(`link`, { name: `` }).click();
// click on firm settings
await page.getByRole(`link`, { name: `Firm Settings` }).click();

const locators2 = [
  // user & groups
  page.getByRole(`link`, { name: `Users & Groups` }),
  // activity log
 page.getByRole(`link`, { name: `Activity Log` }),
  // signature
  page.getByRole(`link`, { name: `CARET Legal Signature™` }),
  // texting
  page.getByRole(`link`, { name: `Client Texting` }),
  // crm
  page.getByRole(`link`, { name: `CRM ` }),
  //firm options
  page.getByRole(`link`, { name: `CRM Options` }),
  // sources
  page.getByRole(`link`, { name: `CRM Sources` }),
  // matters & contacts
  page.getByRole(`link`, { name: `Matters & Contacts ` }),
  // options
  page.getByRole(`link`, { name: `Matter Options` }),
  // practice area
  page.getByRole(`link`, { name: `Practice Areas` }),
  //matter contact
  page.getByRole(`link`, { name: `Matter Contact Roles` }),
  // firm collborator
  page.getByRole(`link`, { name: `Firm Collaborator Roles` }),
  // contact types
  page.getByRole(`link`, { name: `Contact Types` }),
  // custome fields and intake
  page.getByRole(`link`, { name: `Custom Fields & Intake Forms ` }),
  // custom fields
  page.getByRole(`link`, { name: `Custom Fields`, exact: true }),
  // intake forms
  page.getByRole(`link`, { name: `Intake Forms`, exact: true }),
  // Events and calendar rules
  page.getByRole(`link`, { name: `Events & Calendar Rules ` }),
  // event categories
  page.getByRole(`link`, { name: `Event Categories` }),
  // calendar rules
  page.getByRole(`link`, { name: `Calendar Rules`, exact: true }),
  // dae calculation templates
  page.getByRole(`link`, { name: `Date Calculation Templates` }),
  // workflow templates
  page.getByRole(`link`, { name: `Workflow Templates` }),
  // zoom integration
  page.getByRole(`link`, { name: `Zoom Integration` }),
  // document & notes
  page.getByRole(`link`, { name: `Documents & Notes ` }),
  //  default folders
  page.getByRole(`link`, { name: `Default Folders` }),
  // integration
  page.getByRole(`link`, { name: `Integration`, exact: true }),
  // hotdocs
  page.getByRole(`link`, { name: `HotDocs` }),
  // summary
  page.getByRole(`link`, { name: `Quick Summary` }),
  // billing and accounting
  page.getByRole(`link`, { name: `Billing & Accounting ` }),
  // billing options
  page.getByRole(`link`, { name: `Billing Options` }),
  //email options
  page.getByRole(`link`, { name: `Email Options` }),
  // billing groups
  page.getByRole(`link`, { name: `Billing Groups` }),
  // time entry categories
  page.getByRole(`link`, { name: `Time Entry Categories` }),
  // time entry rules
  page.getByRole(`link`, { name: `Time Entry Rules` }),
  // custom utbms codes
  page.getByRole(`link`, { name: `Custom UTBMS Codes` }),
  //flat fee
  page.getByRole(`link`, { name: `Flat-Fee/Service Descriptions` }),
  // rate cards
  page.getByRole(`link`, { name: `Rate Cards` }),
  // invoice creation
  page.getByRole(`link`, { name: `Invoice Customization` }),
  // caret payments integration
  page.getByRole(`link`, { name: `CARET Payments Integration` }),
  // quickbooks integration 
  page.getByRole(`link`, { name: `QuickBooks Integration (` }),
  // soft costs
  page.getByRole(`link`, { name: `Default Soft Costs` }),
  // timekeeper goals
  page.getByRole(`link`, { name: `Timekeeper Goals` }),
  // bank account permissions
  page.getByRole(`link`, { name: `Bank Account Permissions` }),
  // caret legal
  page.getByRole(`link`, { name: `Your CARET Legal Account ` }),
  // export
  page.getByRole(`link`, { name: `Export` }),
  // plans $ payment
  page.getByRole(`link`, { name: `Plans & Payment` })
];

for (let locator of locators2) {
  try {
    // Use the locator's click method
    await locator.click();
    
    // Wait for the page to load, wait 30 seconds
    await page.waitForLoadState("domcontentloaded", {
      timeout: 1 * 30 * 1000, 
    });
    
    // Log the tab details that was clicked on
    console.log(`Successfully clicked on the element: ${await locator.evaluate(el => el.outerHTML)}`);
  } catch (error) {
    // Log if it fails to click on a tab link
    console.error(
      `Error clicking on the element: ${await locator.evaluate(el => el.outerHTML)}\n`,
      error
    );
    throw error; 
  }
}
