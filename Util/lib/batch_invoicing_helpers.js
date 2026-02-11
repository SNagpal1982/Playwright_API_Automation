import { faker, expect } from '../qawHelpers';

 async function createTimeEntryInMatter(page, count = 1){
      await page.locator(`#cw-quick-add-button`).click();
      await page.locator(`#main-menu .new-time-entry a`).click();
      await page.waitForLoadState('domcontentloaded');
      var totalAmount = 0.00;

      // Wait for the UserMatterList API call to complete
      // await page.waitForResponse(
      //   response => response.url().match(/\/api2\/UserMatterList\/\d+/),
      //   { timeout: 20000 }
      // );
      await page.waitForTimeout(3000); // Wait for the modal to load
      for (let i = 0; i < count; i++) {
          var randomDate = faker.date.recent(30); // Random date within the last 30 days
          var randomDuration = faker.datatype.number({ min: 15, max: 270}).toString() + "m"; // Random duration between 15 minutes and 4.5 hours
          var description = `Time Entry ${i + 1} - ${faker.lorem.sentence()}`;
          var rate = faker.datatype.float({ min: 5, max: 100 }).toFixed(2); // Random rate between $5 and $100

          const formattedRandomDate = `${(randomDate.getMonth() + 1).toString().padStart(2, "0")}/${randomDate.getDate().toString().padStart(2, "0")}/${randomDate.getFullYear()}`;
          await page.locator(`#te_durDate`).fill(formattedRandomDate);

          // Fill Duration
          await page.locator(`#te_durationVal`).fill(randomDuration);

          // Select Work Type
          await page.locator(`label:has-text("Work Type") + div a:visible`).click();
          await page.locator(`li:has-text("Consultation"):visible`).click();    

          // Fill Rate
          await page.locator(`#te_rate`).fill(rate);

          // Fill Narrative
          await page.locator(`label:has-text("Narrative") + textarea`).fill(description);

          await page.waitForTimeout(200);
          const amountText = await page.locator(`#te_totalAmountInput`).inputValue();
          totalAmount += parseFloat(amountText);
          
          // Click Save
          if(i === count - 1) 
            await page.locator(`#btnSaveClose`).click();
          else
            await page.locator(`#btnSaveNew`).click();

          await expect(page.locator(`.toast-message:has-text("Time Entry was added successfully!")`)).toBeVisible();
          page.locator(`.toast-message:has-text("Time Entry was added successfully!")`).click();
          await page.waitForTimeout(300);
      }
      
      return totalAmount;
  };

  async function createExpenseInMatter(page, count = 1){
      await page.locator(`#cw-quick-add-button`).click(); 
      await page.locator(`#main-menu .new-expense a`).click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(12000);
      var totalAmount = 0.00;
      for (let i = 0; i < count; i++) {
          var randomDate = faker.date.recent(30); // Random date within the last 30 days
          var description = `Expense ${i + 1} - ${faker.lorem.sentence()}`;
          var rate = faker.datatype.float({ min: 5, max: 100 }).toFixed(2); // Random rate between $5 and $100
          var quantity = faker.datatype.number({ min: 1, max: 10 }).toString(); // Random quantity between 1 and 10

          const formattedRandomDate = `${(randomDate.getMonth() + 1).toString().padStart(2, "0")}/${randomDate.getDate().toString().padStart(2, "0")}/${randomDate.getFullYear()}`;
          await page.locator(`#new-softcost-datepicker`).fill(formattedRandomDate);

          // Fill Rate
          await page.locator(`#sc_SoftCostPrice`).fill(rate);  
          
          // Fill Quantity
          await page.locator(`#sc_SoftCostQtn`).fill(quantity);

          // Fill Description
          await page.locator(`#sc_SoftCostDesc`).fill(description);
          
          await page.waitForTimeout(250);
          const amountText = await page.locator(`#new-soft-cost-dlg .mg-top`).nth(11).locator(`div`).innerText();
          const amount = parseFloat(amountText.replace('$', ''));
          totalAmount += amount;

          // Click Save
          if(i === count - 1) {
            await page.locator(`#new-soft-cost-dlg #scBtnSave`).click();
            await expect(page.locator(`#new-soft-cost-dlg`)).not.toBeVisible();
          } 
          else
            await page.locator(`#new-soft-cost-dlg #scBtnSaveNew`).click();
          await page.waitForTimeout(1000);
      }

      return totalAmount;
  }

  async function createFlatFeeInMatter(page, count = 1){
      /// Click on the "Time/Expenses" tab
      await page.locator(`.rtsLI:has-text("Time/Expenses")`).click()

      // Click on the "Flat Fees" section
      const frame = await(await page.waitForSelector("#Iframe6")).contentFrame(); 
      await frame.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);
      await frame.locator(`#flatfees`).click();

      await page.waitForTimeout(2000);
      var matterId = await page.evaluate(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('MatterID');
      });

      var totalAmount = 0.00;
      for (let i = 0; i < count; i++) {

          // Click the plus icon in the section header
          await frame.locator(`#add-new-flatfee`).click()
          await page.waitForTimeout(1000);
          // Fill all input fields from the details object
          
           // Wait until input with id flatFeeEntryMatterdrp has value matterId
          await page.waitForFunction(() => {
            const element = document.querySelector('#flatFeeEntryMatterdrp');
            return element && element.value === matterId;
          }, { timeout: 10000 });

          // -- Service Type
          await page.locator(`#NewFlatFeeModal #s2id_drpflatfeeEntryServices`).click()
          await page.keyboard.type("Consultation fee")
          await page.getByRole("option", {name: "Consultation fee"}).click()
          
          await page.waitForTimeout(300);

          var randomDate = faker.date.recent(30); // Random date within the last 30 days
          var description = `Flat Fee ${i + 1} - ${faker.lorem.sentence()}`;
          var rate = faker.datatype.float({ min: 5, max: 100 }).toFixed(2); // Random rate between $5 and $100
          var quantity = faker.datatype.number({ min: 1, max: 10 }).toString(); // Random quantity between 1 and 10

          const formattedRandomDate = `${(randomDate.getMonth() + 1).toString().padStart(2, "0")}/${randomDate.getDate().toString().padStart(2, "0")}/${randomDate.getFullYear()}`;
          await page.locator(`#new-flatfee-datepicker`).fill(formattedRandomDate);

          // -- Quantity
          await page.locator(`#NewFlatFeeModal [data-bind="value: quantity"]`).fill(quantity)
          
          // -- Rate
          await page.locator(`#NewFlatFeeModal [data-bind="value: rate"]`).fill(rate)
          
          // -- Description
          await page.locator(`#NewFlatFeeModal [data-bind="value: description"]`).fill(description)
            
          await page.waitForTimeout(250);
          // Get the total amount from the modal
          const amountText = await page.locator(`#NewFlatFeeModal .total-amount-flatfee`).nth(1).innerText()
          const amount = parseFloat(amountText);
          totalAmount += amount;

          // Click Save
          await page.locator(`[data-bind="click: saveFlatFee"]`).click();
          await page.waitForTimeout(250);
          //await expect(page.locator(`.toast-success:has-text("Saved Successfully")`)).toBeVisible();
          await expect(page.locator(`#NewFlatFeeModal`)).not.toBeVisible();
      }

      return totalAmount;
  }
  
  async function setUpMatterForBatchInvoicing(page, matter) {
      // Cleanup existing matters if needed
      // Cleanup any previous mattters if needed
      try {
        await cleanUpMatterByName(page, matter.name);
      } catch {
        await reportCleanupFailed();
      }
      
      // Create a new matter
      await createAMatter(page, matter);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2_000);

      var minimumActivityCount = 4; // Minimum number of activities to create
      var maximumActivityCount = 5; // Maximum number of activities to create
      // Create billable activity in matter 
      matter.totalAmount += await createTimeEntryInMatter(page, faker.datatype.number({ min: minimumActivityCount, max: maximumActivityCount }));
      matter.totalAmount += await createExpenseInMatter(page, faker.datatype.number({ min: minimumActivityCount, max: maximumActivityCount }));
      matter.totalAmount += await createFlatFeeInMatter(page, faker.datatype.number({ min: minimumActivityCount, max: maximumActivityCount }));
      console.log(`Matter ${matter.name} created with total amount: ${matter.totalAmount}`);
      await page.waitForLoadState('domcontentloaded');

      matter.matterNumber = await page.locator(`#slct2_matter_list`).innerText();
      matter.matterId = await page.evaluate(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('MatterID');
      });

      // Return object with id and name
      return matter;
  }

  //Incompatible with load testing due to potential of duplicate invoices being created
  async function checkInvoicesForMatter(page, matterInfo) { 
      
      // await goToMatter(page, matterInfo.matterNumber);

      // // Click on the Invoices tab
      // await page.locator('.rtsLI:has-text("Invoices")').click();
      // await page.waitForLoadState('domcontentloaded');
      // await page.waitForTimeout(2000);

      // var matterTotalText = await page.frameLocator("#Iframe7").locator(`#rdgListBillContainer .rgFooter td`).nth(7).innerText();
      // matterTotalText = matterTotalText.replace(/[$,]/g, ''); // Remove $ and , from the string
      // var matterTotal = parseFloat(matterTotalText);

      // // Ensure totalAmount is a number by removing $ and commas if it's a string
      // let expectedTotal = matterInfo.totalAmount;
      // if (typeof expectedTotal === 'string') {
      //   expectedTotal = parseFloat(expectedTotal.replace(/[$,]/g, ''));
      // }
      
      // // Now compare the numbers
      // var difference = Math.abs(matterTotal - expectedTotal);
      // console.log(`Matter ${matterInfo.matterNumber}: UI total = ${matterTotal}, Expected total = ${expectedTotal}, Difference = ${difference}`);
      // expect(difference).toBeLessThanOrEqual(0.10, `The total amount for matter ${matterInfo.matterNumber} does not match the expected total amount.`);
  }

  export {
    setUpMatterForBatchInvoicing
};