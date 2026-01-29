import { expect } from 'playwright/test';
import fs from 'fs';
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js'; // note the .js in some bundlers
dayjs.extend(utc);

export async function createInvoiceUI() {
    //Click on Invoice
    console.log("Step : Select 'Invoice' Options");
    await page.locator("span.rtsTxt").getByText("Invoices").click();
    console.log("Step : Select '+' option");

    let frame = await (await page.waitForSelector("#Iframe7")).contentFrame();
    const plus = frame.locator('a.add-btn.plus-icon.accounting-create-new-icon[data-toggle="dropdown"]');
    await plus.waitFor({ state: 'visible', timeout: 30_000 });
    await plus.click();
    console.log("Step : Select 'New Invoice From Scratch' option");
    await frame.getByText('New Invoice From Scratch').click();
    // await page.locator('#inv-select-matter-form').waitFor();
    console.log("Step : Select 'Start invoice' option");
    await page.getByRole('button', { name: 'Start invoice' }).click();
    //Wait for loading teh invoice page 
    await page.waitForLoadState('load');
    //Click on Load button
    console.log("Step : Click on Create Button")
    await page.locator('.create-btn').click();
    console.log("Invoice is created successfully.");
}
export async function createMatterAPI(request, matterName) {
    const webTok = await getAuthToken();
    const cookieHeader = await getCookieHeader();
    const randomNumber = new Date().toISOString();
    const matterOpenDate = randomNumber.split('T')[0].replace(/-/g, '/');
    const response = await request.post(
        'https://qa.zolastaging.com/api2/Matter/',
        {
            headers: {
                accept: 'application/json, text/javascript, */*; q=0.01',
                authorization: `Bearer ${webTok}`,
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'x-requested-with': 'XMLHttpRequest',
                'svc-type': 'web',
                'Cookie': cookieHeader
            },
            form: {
                MatterActiveStatusId: '1',
                MatterName: matterName,
                MatterOpenDate: matterOpenDate,
                MatterStatusId: '1',
                MatterPracticeAreaId: '30548',
                MatterPracticeArea: 'Business Development',
                MatterClientName: 'Pawnee Parks and Recreation',
                MatterClient: '1398602',
                MatterAttorneyInchargeId: '34705',
                MatterOfficeId: '2919',
                MatterBillingType: '1',
                MatterCurrencyId: '1',
                MatterIsFlatFeeAllocationEnabled: '0',
                MatterIncrement: '6',
                MatterIsRestricted: 'false',
                AdditionalClientInMatterList: '[]',
                CustomUserRates: '[]',
                Originators: '[]',
                Responsible: '[]',
                SelectedUTBMS: '[]',
                PreferredMethod: '0',
                SoftCostRevPercentage: '0.00',
                SplitBilling: 'false',
                InvoicePrintTemplateId: '3172',
                EnablePIModule: 'false',
                ChargeInterest: 'false',
                InterestRate: '0',
                InterestType: '0',
                InterestPeriod: '0',
                InterestGracePeriod: '0',
                TimeEntryRuleIds: ''
            }
        }
    );
    // Status validation
    expect(response.status()).toBe(200);
    // Body validation
    const matterId = await response.text();
    expect(matterId).toBeDefined();
    return matterId;
}
export async function getMatterId(request, matterId) {
    const webToken = await getAuthToken();
    const getHeader = await getCookieHeader();
    const response = await request.get(`https://qa.zolastaging.com/api2/Matter/${matterId}`, {
        headers: {
            accept: 'application/json, text/javascript, */*; q=0.01',
            authorization: `Bearer ${webToken}`,
            'x-requested-with': 'XMLHttpRequest',
            'svc-type': 'web',
            cookie: getHeader,
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'traceparent': '00-00000000000000006f08a892b4d246a8-468eadadf55ed232-01',
        },
    });
    expect(response.status()).toBe(200);
    return await response.json();
}
export async function createTimeEntryAPI(request, matterDetails) {
    //Create New Time Entry for the created Matter
    const webTok = await getAuthToken();
    const cookieHeader = await getCookieHeader();
    const d = new Date();
    const workdate = dayjs.utc(d).format('MM/DD/YYYY h:mm A');
    const timeEntryResponse = await request.post(
        'https://qa.zolastaging.com/api2/time/',
        {
            headers: {
                accept: 'application/json, text/javascript, */*; q=0.01',
                authorization: `Bearer ${webTok}`,
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'x-requested-with': 'XMLHttpRequest',
                'svc-type': 'web',
                'Cookie': cookieHeader
            },
            form: {
                tien_matterid: matterDetails.matterId,
                tien_matteruserid: '34701',
                tien_timetype: '2',
                tien_workdate: matterDetails.matterOpenDate, //Mapped with Date in UI
                tien_duration: '9000',  //Value in sec
                tien_worktypeid: '5897',
                tien_worktypeIsUTBMS: 'false',
                tien_rate: '5.00',  //Mapped with rate in UI
                tien_description: 'Test',
                tien_total: '123',
                tien_actualduration: '9000',    //Value in sec
                tien_isHiustorical: 'false',
                tien_isNoCharge: 'false',
                tien_isNcds: 'false',
                tien_isAdmin: 'false',
                tien_isSplit: 'false',
                tien_splitUsers: '[]',
                ExcludeFromAllocation: 'false',
            }
        }
    );
    expect(timeEntryResponse.status()).toBe(200);
    const newTimeEntryResponse = await timeEntryResponse.json();
    return newTimeEntryResponse.tien_id;

}
export async function createFlatEntryAPI(request, matterId) {
    //Create New Flat Entry for the created Matter
    //<< NEED TO REVISIT FOR >>
    const webTok = await getAuthToken();
    const cookieHeader = await getCookieHeader();
    const d = new Date();
    const workdate = dayjs.utc(d).format('MM/DD/YYYY h:mm A');
    const flatEntryResponse = await request.post(
        'https://qa.zolastaging.com/api2/Flat/',
        {
            headers: {
                accept: 'application/json, text/javascript, */*; q=0.01',
                authorization: `Bearer ${webTok}`,
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'x-requested-with': 'XMLHttpRequest',
                'svc-type': 'web',
                'Cookie': cookieHeader
            },
            form: {
                tien_matterid: matterId,
                tien_matteruserid: '34701',
                tien_timetype: '2',
                tien_workdate: workdate, //Mapped with Date in UI
                tien_duration: '9000',  //Value in sec
                tien_worktypeid: '5897',
                tien_worktypeIsUTBMS: 'false',
                tien_rate: '5.00',  //Mapped with rate in UI
                tien_description: 'Test',
                tien_total: '123',
                tien_actualduration: '9000',    //Value in sec
                tien_isHiustorical: 'false',
                tien_isNoCharge: 'false',
                tien_isNcds: 'false',
                tien_isAdmin: 'false',
                tien_isSplit: 'false',
                tien_splitUsers: '[]',
                ExcludeFromAllocation: 'false',
            }
        }
    );
    expect(flatEntryResponse.status()).toBe(200);
    const newFlatEntryResponse = await flatEntryResponse.json();
    console.log("New Flat Entry with Id '", await newFlatEntryResponse.tien_id, "' for Matter No. '", newFlatEntryResponse.tien_matterno, "' has been created.");


}
export async function createInvoiceAPI(request, matterDetails) {
    const webTok = await getAuthToken();
    const cookieHeader = await getCookieHeader();

    let d = new Date();
    const invoiceDate = d.toISOString().replace(/\.\d{3}Z$/, "");
    let dueDate = new Date(d);       // clone it
    dueDate.setDate(dueDate.getDate() + 1);
    dueDate = dueDate.toISOString().replace(/\.\d{3}Z$/, "");
    const toDate = d.toISOString().split("T")[0];
    const payload = {
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        fromDate: null,
        toDate: toDate,
        matterId: matterDetails.matterId,      
        clientUid: null,
        practiceAreaId: null,
        responsibleAttorneyId: null,
        billingTypeId: null,
        workTypeId: null,
        detailTypeId: null,
        matterStatusId: null,
        billingAttorneyId: null,
        origAttorneyId: null,
        unbilledActivityTypes: null,
        billingGroups: null,
        filterTimeEntrySumGreaterThan: null,
        filterTimeEntrySumLessThan: null,
        itemsCount: 1,
        sendEmailWhenCompleted: true
    };
    const response = await request.post('https://qa.zolastaging.com/api/invoice/billables/fromfilters',
        {
            headers: {
                accept: 'application/json, text/javascript, */*; q=0.01',
                authorization: `Bearer ${webTok}`,
                'content-type': 'application/json',
                'x-requested-with': 'XMLHttpRequest',
                'svc-type': 'web',
                'cookie': cookieHeader
            },
            data: JSON.stringify(payload)
        }
    );
    expect(response.status()).toBe(200);
    const responseBody = await response.json();
    const invoiceId = responseBody.invoices[0].value;
    return invoiceId;
}
export async function getCookies() {
    const authPath = 'storageState/auth.json';
    const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    return state.cookies;
}
export async function getCookieHeader() {
    const authPath = 'storageState/auth.json';
    const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const cookieHeader = state.cookies.map(c => `${c.name}=${c.value}`).join('; ');
    return cookieHeader;

}
export async function getAuthToken() {
    const authPath = 'storageState/auth.json';
    const state = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const webTok = (state.cookies || []).find(c => c.name === 'web-tok');
    if (!webTok?.value) {
        throw new Error(`Cookie "web-tok" not found in ${authPath}`);
    }
    return webTok.value;
}
