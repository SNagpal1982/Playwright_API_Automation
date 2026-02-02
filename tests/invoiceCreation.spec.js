import { test, expect } from '@playwright/test';
import { createInvoiceAPI, createMatterAPI, getMatterDetails, createTimeEntryAPI, createFlatEntryAPI } from '../Util/helper.js';

test("Creating Invoice through API", async ({ request }) => {
  console.log("..........Creating Invoice through API..........");

  console.log("Step : Creating matter API");
  const randomNumber = new Date().toISOString();
  const currentDateTime = randomNumber.replace(/[-T:Z.]/g, "");
  const matterName = "SN Test Matter API - " + currentDateTime;
  console.log("Matther Name: " + matterName);
  const matterId = await createMatterAPI(request, matterName);
  console.log('Newly Created Matter ID:', matterId);
  const matterDetails = await getMatterDetails(request, matterId);
  console.log("Matter Name : " + matterDetails.matterName);
  console.log("Matter No : " + matterDetails.matterNumber);

  //Create Time Entry for the matter
  console.log("Step : Creating Time Entry for the matter : '" + matterDetails.matterName);
  const timeEntryId = await createTimeEntryAPI(request, matterDetails);
  console.log("New Time Entry '", timeEntryId, "' for matter:'", matterDetails.matterName);
  
  //Create Flat fee Entry for the matter
  console.log("Step : Creating Flat Fee Entry for the matter : '" + matterDetails.matterName);
  await createFlatEntryAPI(request, matterDetails);
  console.log("New Flat Fee Entry for matter : '", matterDetails.matterName);

  //Create Invoice for the matter
  console.log("Step : Creating Invoice for the matter : '" + matterDetails.matterName);
  const invoiceNo = await createInvoiceAPI(request, matterDetails);
  console.log("New Invoice '", invoiceNo, "' for matter:'", matterDetails.matterName);

});