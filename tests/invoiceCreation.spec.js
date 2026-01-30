import { test, expect, request } from '@playwright/test';
import { createInvoiceAPI, createMatterAPI, createTimeEntryAPI, getMatterId } from '../Util/helper.js';

test("Creating Invoice through API", async ({ request }) => {
  console.log("..........Creating Invoice through API..........");
  console.log("Step : Creating matter API..........");
  const randomNumber = new Date().toISOString();
  const currentDateTime = randomNumber.replace(/[-T:Z.]/g, "");
  const matterName = "SN Test Matter API - " + currentDateTime;
  console.log("Matther Name: " + matterName);
  const matterId = await createMatterAPI(request, matterName);
  expect(matterId).toBeTruthy();
  console.log('Newly Created Matter ID:', matterId);
  const matterDetails = await getMatterId(request, matterId);
  console.log("Matter Name : "+ matterDetails.matterName);
  console.log("Matter No : " + matterDetails.matterNumber);
  console.log("Step : Creating Time Entry for the matter : " + matterDetails.matterName);
  const timeEntryId = await createTimeEntryAPI(request, matterDetails);
  console.log("New Time Entry with Id has been created'", timeEntryId, "' for matter:'", matterDetails.matterName);
  console.log("Step : Creating Invoice for the matter : " + matterDetails.matterName);
  const invoiceNo = await createInvoiceAPI(request,matterDetails);
  console.log("New Invoice with Id has been created'", invoiceNo, "' for matter:'", matterDetails.matterName);

});