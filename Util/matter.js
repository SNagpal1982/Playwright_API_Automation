import { expect } from 'playwright/test';
import fs from 'fs';
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js'; // note the .js in some bundlers
dayjs.extend(utc);

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

export async function getMatterList(request, authDetails, payLoad ={}, options = {}) {
    const response = await request.put(`https://qa.zolastaging.com/api2/customField/MatterCustomViewAction/`, {
        headers: {
            accept: 'application/json, text/javascript, */*; q=0.01',
            authorization: `Bearer ${authDetails.webToken}`,
            'x-requested-with': 'XMLHttpRequest',
            'svc-type': 'web',
            cookie: authDetails.cookieHeader,
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
        },
    });
    expect(response.status()).toBe(200);
    const reps = await response.json();
    console.log("Matter List has been fetched with below Details:" + JSON.stringify(reps));
    // return await response.json();
}
