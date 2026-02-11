import { assert, expect, test, getInbox, launch, dotenv, saveTrace, faker, dateFns, twilio, StreamZip, axios, xlsx, jsQR, pngjs } from '../qawHelpers';

const clients = {
  "Matter Texting User 1": process.env.MATTER_TEXTING_TWILIO_1,
  "Matter Texting User 2": process.env.MATTER_TEXTING_TWILIO_2,
  "Matter Texting User 3": process.env.MATTER_TEXTING_TWILIO_3,
  "Matter Texting User 4": process.env.MATTER_TEXTING_TWILIO_4,

};

const matter = {
  name: "Utils - SetUp Client texting",
  primaryClient: "Pawnee Parks and Recreation",
  practiceArea: "Business Development",
};

const sendBody = "Start";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

// Login to CARET Legal
const { page } = await logIn();

// clean up if needed
await cleanUpMatterByName(page, matter.name);

// open contact page
await page.locator(`#contacts a`).click();
await page.waitForLoadState("domcontentloaded")

// create a new client if needed
for (let [clientName, phone] of Object.entries(clients)) {
  let parts = clientName.split(" "); // Splitting the string into an array of words.

  // fName would be all parts except the last two words joined back with spaces.
  let fName = parts.slice(0, -2).join(" ");

  // lName would be just the last two words joined back with a space.
  let lName = parts.slice(-2).join(" ");

  // search for client
  await page.locator(`#page-search`).fill(clientName);
  await page.keyboard.press("Enter")

  if (await isVisible(page, `#contactList li:has-text("${clientName}")`, 3000)) {
    console.warn(`Client: ${clientName} has already been created!`)
    continue
  } else {
    await addPersonContactFromContactPage(page, {
      fName,
      lName,
      email: faker.internet.email(),
      phone
    })
  }

}

// Helper function to create a new matter
const { matterNo } = await createAMatter(page, matter);

// click on client text button
const [textPage] = await Promise.all([
  page.waitForEvent("popup"),
  page.locator(`#cw-texting-button`).click(),
]);
await textPage.waitForLoadState("domcontentloaded");
await textPage.waitForTimeout(2000);

// clean up if needed
await cleanUpTextMessagesFromTextPage(textPage, matter.name);

for (let [clientName, phoneNo] of Object.entries(clients)) {
  // click new conversation
  await textPage.locator(`.fa-pencil-square-o`).click()

  // add matter to the conversation
  await textPage.locator(`#addMatter .select2-container`).click();
  await textPage.keyboard.type(matterNo);
  await textPage.getByRole("option", { name: matterNo }).click();

  // send to
  await textPage.locator(`#addParticipant`).click();
  await textPage.keyboard.type(clientName);
  await textPage.getByRole("option", { name: `${clientName} [${phoneNo}]`, }).click();

  // grab time before clicking update
  let timeAfter = new Date();

  if( !(await isVisible(textPage, `.media p:has-text("consent")`, 2000))) {
    console.warn(`Client: ${clientName} has already given consent!`)
    await cleanUpTextMessagesFromTextPage(textPage, matter.name);
    continue
  }

  // click consent Text
  textPage.once("dialog", (dialog) => {
    dialog.accept().catch((err) => {
      console.error('Failed to accept dialog:', err);
    });
  });
  await textPage.locator(`.media p:has-text("consent")`).click()
  await textPage.locator(`#MsgListContainer p:has-text("please reply with START")`).waitFor()

  await expect( async() => {
    const message = await client.messages.list({
      dateSent: timeAfter,
      to: phoneNo,
    });

    expect(message[0].body).toContain("please reply with START to consent")
  }).toPass({
    timeout: 1 * 60 * 1000
  })

  // send user message from Twilio
  await client.messages.create({
    body: sendBody,
    from: phoneNo,
    to: process.env.CARET_TWILIO_NUMBER,
  });
  await textPage.waitForTimeout(3000)

  // refresh is sometimes needed
  await textPage.locator(`.zola-icon-refresh`).click();
  await textPage.locator(`#MsgListContainer p:text-is("${sendBody}")`).waitFor()

  // successful message should appear
  await expect(textPage.locator(`#MsgListContainer p:has-text("You have successfully opted to receive text messages")`)).toBeVisible()

  // clean up
  await cleanUpTextMessagesFromTextPage(textPage, matter.name);
}

// clean up message
await cleanUpTextMessagesFromTextPage(textPage, matter.name)

// Clean up matter
await textPage.close()
await cleanUpMatterByName(page, matter.name);
