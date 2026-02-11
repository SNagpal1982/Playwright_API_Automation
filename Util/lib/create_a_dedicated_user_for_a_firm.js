import { assert, expect, test, getInbox, launch, dotenv, saveTrace, faker, dateFns, twilio, StreamZip, axios, xlsx, jsQR, pngjs } from '../qawHelpers';

// master admin accounts
// caret+MasterAdminCustomImportmatter@qawolfworkflows.com
// caret+masteradminimportcompanyfirm4@qawolfworkflows.com
// caret+MasterAdminCustomImportmatter@qawolfworkflows.com
// caret+masteradminimportsoftcostfirm3@qawolfworkflows.com
// caret+masteradminimportuserfirmtwouser@qawolfworkflows.com
// password: QAWolf123!

let placeholder = "" // <--- add an email placeholder to create user email for user. Inside the string
const newUserEmail = `caret+${placeholder}@qawolfworkflows.com`// --> this will become the new email with the placeholder
const outlookEmail = "carettester@outlook.com"
const { emailAddress, waitForMessage } = await getInbox({
  address: newUserEmail
});

const user = {
  fName: faker.name.firstName(), // fill in appropriate name
  lName: faker.name.lastName(), // fill in appropriate name
  email: emailAddress,
  role: "Administrator",
  type: "Attorney",
};

// Log in
// DEFAULT_USER : First Firm,   -->>> Firm name: QA Wolf Automation Team
// SECOND_USER : Second Firm Can Blast, -->>> Firm name:  QA Wolf 2
// THIRD_USER: Third Firm, -->>> Firm name: QAWOLF THREE
// FOURTH_USER: Fourth Firm   -->>> Firm name: QA Wolf Four       ** DO NOT USE workflows that will create workflow templates for this firm **,
// FIFTH_USER: Fifth Firm, -->>> Firm name: QA Wolf Five       Can Blast and APX Disabled(Do not enable this), 
// SIXTH_USER: Sixth Firm firm id, 29482 ---> QA Wolf Six
console.log(process.env.THIRD_USER) // log email here to check
console.log(process.env.THIRD_USER_PASSWORD)
const { page } = await logIn({
  email: process.env.SIXTH_USER, // Change env variable to use a different firm
  timezoneId: `America/New_York`,
  slowMo: 1000
  // password: process.env.THIRD_USER_PASSWORD
});
// go to firm setting -> user and groups
await page.locator(`#imgUserPic`).click();
await page.getByRole("link", { name: "Firm Settings"}).click();
await page.locator(`a:text("Users & Groups")`).click();

// helper function to create user
await createUserAndLogIn(page, user)

// sign in with created user
// Log in
const { page: page2, context } = await logIn({
  email: newUserEmail,
  timezoneId: `America/New_York`
});
// / click avatar dropdown
await page2.locator(`#imgUserPic`).click();
// click my settings
await page2.locator(`li:has-text("My Settings")`).click();

//--------------------------------
// Act:
//--------------------------------
// open outlook connection modal
const settingsFrame = page2.frameLocator(`#userSettingsModal-iframe`);
//click on email set up
await settingsFrame
  .locator(`li#userSettingTab3:has-text("Email Setup")`)
  .click();
const pagePromise = context.waitForEvent("page");
// check for the presence of the 'register' or 're-register' button
const outlookButton = settingsFrame.locator(`#user-settings-register-outlook`);
const reOutlookButton = settingsFrame.locator(`#user-settings-re-register-outlook`);

if (await outlookButton.isVisible()) {
  await outlookButton.click();
} else if (await reOutlookButton.isVisible()) {
  await reOutlookButton.click();
}

const newPage = await pagePromise;
await newPage.waitForLoadState("domcontentloaded");

// fill out email
await newPage.locator(`[type="email"]`).fill(outlookEmail);
await newPage.locator(`[type="submit"]`).click();
await newPage.waitForLoadState("domcontentloaded");

await newPage.waitForTimeout(2_000)

if (await newPage.getByRole(`heading`, { name: `Verify your email` }).isVisible()){
await newPage.getByRole(`button`, { name: `Use your password` }).click();
}
// fill out password and IMAP settings
await newPage
  .getByRole(`textbox`, { name: `Password` })
  .fill(process.env.DEFAULT_LEGAL_PASSWORD);
await newPage.locator(`[data-testid="primaryButton"]`).click();
await newPage.locator(`[data-testid="secondaryButton"]`).click();
//--------------------------------
// Assert:
//--------------------------------z
await newPage.waitForTimeout(2000);
//assert successful email registration
await expect(newPage.getByText(`Email setup was successful!`)).toBeVisible();
//--------------------------------z
await newPage.waitForTimeout(2000);
// click the update email settings blue button
await newPage.getByText(`Update Email Settings`).click();
// click on email setup in settings
await settingsFrame
  .locator(`li#userSettingTab3:has-text("Email Setup")`)
  .click();
await page.waitForTimeout(1000);

// assert save is true
const saveButton = settingsFrame.locator('#user-settings-main-modal').getByText('Save', { exact: true })
await saveButton.click();
// / click avatar dropdown
await page2.locator(`#imgUserPic`).click();
// click my settings
await page2.locator(`li:has-text("My Settings")`).click();


