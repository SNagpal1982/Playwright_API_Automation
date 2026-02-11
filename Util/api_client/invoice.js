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
    const d = new Date().toISOString();
    const matterOpenDate = d.split('T')[0].replace(/-/g, '/');
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
    expect(matterId).toBeTruthy();
    // Accept numeric or string IDs; if numeric ensure > 0, if string ensure non-empty
    expect(typeof matterId === 'string' || typeof matterId === 'number').toBeTruthy();
    if (typeof matterId === 'string') expect(matterId.length).toBeGreaterThan(0);
    if (typeof matterId === 'number') expect(matterId).toBeGreaterThan(0);
    return matterId;
}
export async function getMatterDetails(request, matterId) {
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
    // Create New Time Entry for the created Matter
    const webTok = await getAuthToken();
    const cookieHeader = await getCookieHeader();
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
    const timeEntryId = newTimeEntryResponse.tien_id;
    expect(timeEntryId).toBeTruthy();
    expect(typeof timeEntryId === 'string' || typeof timeEntryId === 'number').toBeTruthy();
    if (typeof timeEntryId === 'string') expect(timeEntryId.length).toBeGreaterThan(0);
    if (typeof timeEntryId === 'number') expect(timeEntryId).toBeGreaterThan(0);
    return timeEntryId;

}
export async function createFlatEntryAPI(request, matterDetails) {
    //Create New Flat Entry for the Matter
    const webTok = await getAuthToken();
    const cookieHeader = await getCookieHeader();
    const payload = {
        "MatterId": matterDetails.matterId,
        "ServiceId": "868",
        "Description": "Meeting with the potential new client to     \r\n       discuss their goals, needs and expected outcomes.",
        "Rate": "1.00",
        "Quantity": "1.5",
        "UserId": 34701,
        "Date": dayjs.utc(matterDetails.MatterOpenDate).format('YYYY-MM-DD'), //Mapped with Date in UI
        "Total": "1.50",
        "IsEdit": false,
        "FlatFeeId": "",
        "UtbmsActivityId": null,
        "UtbmsTaskId": null
    };
    const flatEntryResponse = await request.post(
        'https://qa.zolastaging.com/api2/flatfeeentry/save',
        {
            headers: {
                accept: 'application/json, text/javascript, */*; q=0.01',
                authorization: `Bearer ${webTok}`,
                'content-type': 'application/json',
                'x-requested-with': 'XMLHttpRequest',
                'svc-type': 'web',
                'Cookie': cookieHeader
            },
            data: JSON.stringify(payload)
        }
    );
    expect(flatEntryResponse.status()).toBe(200);
}
export async function createInvoiceAPI(request, matterDetails) {
    const webTok = await getAuthToken();
    const cookieHeader = await getCookieHeader();

    let d = new Date();
    const invoiceDate = d.toISOString().replace(/\.\d{3}Z$/, "");
    let dueDate = new Date(d);

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
    expect(invoiceId).toBeTruthy();
    expect(typeof invoiceId === 'string' || typeof invoiceId === 'number').toBeTruthy();
    if (typeof invoiceId === 'string') expect(invoiceId.length).toBeGreaterThan(0);
    if (typeof invoiceId === 'number') expect(invoiceId).toBeGreaterThan(0);
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
