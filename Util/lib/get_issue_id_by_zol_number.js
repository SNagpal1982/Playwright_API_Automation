import { assert, expect, test, getInbox, launch, dotenv, saveTrace, faker, dateFns, twilio, StreamZip, axios, xlsx, jsQR, pngjs } from '../qawHelpers';


export async function getIssueID(zolNumber) {
  const { context } = await launch();
  const page = await context.newPage();
  await page.goto(`https://getcaret.atlassian.net/`);
  
}

await getIssueID('ZOL-7776')
