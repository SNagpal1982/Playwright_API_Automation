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
export async function createExpenseNewCheckEntryAPI(request, matterDetails) {
    //Create New Flat Entry for the Matter
    const webTok = await getAuthToken();
    const cookieHeader = await getCookieHeader();
    const d = new Date();
    const checkDate = dayjs.utc(d).format('DD-MM-YYYY');
    const checkTime = dayjs.utc(d).format('HH:mm:ss');
    const payload = {
        "check": {
            "isDlgOpen": true,
            "dlgTitle": "New Check",
            "id": 0,
            "accountId": 1312140,
            "payeeUid": "21297062",
            "checkNo": "19745",
            "printed": null,
            "memo": "",
            "amountInLetters": "TEN AND 00/100 DOLLARS",
            "locationId": 0,
            "isCheckEdit": false,
            "hasPreviousAccounts": true,
            "accountReconciliationId": null,
            "checkDate": `${checkDate} ${checkTime}`,
            "date": checkDate,
            "time": checkTime,
            "isReconciled": false,
            "amount": "10",
            "details": [
                {
                    "accountId": 1312106,
                    "amount": 10,
                    "matterId": matterDetails.matterId,
                    "piExpenseId": 0,
                    "description": "New Check",
                    "clientBilled": true,
                    "isPreloadedAccount": false,
                    "isDeleted": false,
                    "justCreated": false,
                    "userId": 34701,
                    "isMatterUtbms": false,
                    "isMatterPIEnabled": false,
                    "taskCodeList": [],
                    "userName": "Performance TesterOne",
                    "utbmsTaskCodeName": "",
                    "utbmsExpenseCodeName": "",
                    "piExpenseDate": `${checkDate} ${checkTime}`,
                    "piExpenseAmount": 0
                }
            ],
            "accounts": [
                {
                    "id": 1312140,
                    "name": "Operating Account",
                    "bankName": "Operating Account",
                    "balance": -19578.18,
                    "checkNumber": "19745",
                    "isTrust": false,
                    "isUndeposited": false,
                    "bankAccountType": null,
                    "accountType": "All",
                    "accountTypeId": 0,
                    "accountTypeAndTrustKey": "All.False",
                    "genericAccountId": "0_1312140"
                },
                {
                    "id": 1345016,
                    "name": "Perf Account",
                    "bankName": "Citi Bank",
                    "balance": -392.65,
                    "checkNumber": "2",
                    "isTrust": false,
                    "isUndeposited": false,
                    "bankAccountType": null,
                    "accountType": "All",
                    "accountTypeId": 0,
                    "accountTypeAndTrustKey": "All.False",
                    "genericAccountId": "0_1345016"
                }
            ],
            "payees": [],
            "locations": [
                {
                    "key": 2919,
                    "value": "Port Washington"
                }
            ],
            "documents": [],
            "documentsUploading": 0,
            "allowAccountRelatedChanges": true,
            "savingEnabled": false,
            "isDirty_CheckModel": true,
            "updateReconciliation": false,
            "accountGroups": [
                {
                    "label": "",
                    "children": [
                        {
                            "id": 0,
                            "name": "Select...",
                            "typeId": 0,
                            "parentId": null,
                            "accountCatLevel": null,
                            "accountCatSetId": null
                        }
                    ]
                },
                {
                    "label": "Asset",
                    "children": [
                        {
                            "id": 1312090,
                            "name": "Accounts Receivable",
                            "typeId": 4,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312097,
                            "name": "Accumulated Depreciation",
                            "typeId": 4,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312092,
                            "name": "Advanced Client Costs",
                            "typeId": 4,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312093,
                            "name": "Advanced Client Costs: Court Costs",
                            "typeId": 4,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312094,
                            "name": "Advanced Client Costs: Expert Witness Fees",
                            "typeId": 4,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312095,
                            "name": "Advanced Client Costs: Filing Fees",
                            "typeId": 4,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312096,
                            "name": "Furniture and Equipment",
                            "typeId": 4,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312098,
                            "name": "Security Deposits Asset",
                            "typeId": 4,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312091,
                            "name": "Undeposited Funds",
                            "typeId": 4,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        }
                    ]
                },
                {
                    "label": "Liability",
                    "children": [
                        {
                            "id": 1312099,
                            "name": "Accounts Payable",
                            "typeId": 5,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312101,
                            "name": "Payroll Liabilities",
                            "typeId": 5,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312102,
                            "name": "Retainer",
                            "typeId": 5,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312103,
                            "name": "Sales Tax Payable",
                            "typeId": 5,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312100,
                            "name": "Trust Liability Account",
                            "typeId": 5,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        }
                    ]
                },
                {
                    "label": "Credit Card Account",
                    "children": [
                        {
                            "id": 1345014,
                            "name": "Asma_cc",
                            "typeId": 15,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1345015,
                            "name": "perf test",
                            "typeId": 15,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        }
                    ]
                },
                {
                    "label": "Owner's Capital",
                    "children": [
                        {
                            "id": 1312105,
                            "name": "Opening Balance Equity",
                            "typeId": 6,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312104,
                            "name": "Owner's Capital",
                            "typeId": 6,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312107,
                            "name": "Retained Earnings",
                            "typeId": 6,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        }
                    ]
                },
                {
                    "label": "Expense",
                    "children": [
                        {
                            "id": 1312139,
                            "name": "Ask My Accountant",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312116,
                            "name": "Automobile Expense",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312114,
                            "name": "Bad Debt / Write offs",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312117,
                            "name": "Bank Service Charges",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312118,
                            "name": "Computer and Internet Expenses",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312119,
                            "name": "Continuing Legal Education (CLE)",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312120,
                            "name": "Depreciation Expense",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312121,
                            "name": "Dues and Subscriptions",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312123,
                            "name": "Insurance Disability",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312122,
                            "name": "Insurance Expense",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312125,
                            "name": "Insurance General Liability",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312126,
                            "name": "Insurance Health",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312124,
                            "name": "Insurance Professional Liability",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312127,
                            "name": "Interest Expense",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312128,
                            "name": "Meals and Entertainment",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312089,
                            "name": "Misc Expense",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312129,
                            "name": "Office Supplies",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312130,
                            "name": "Payroll Expenses",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312131,
                            "name": "Postage and Delivery",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312132,
                            "name": "Professional Fees Expense",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312133,
                            "name": "Rent Expense",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312134,
                            "name": "Repairs and Maintenance",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312135,
                            "name": "Research Services",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312136,
                            "name": "Telephone Expense",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312137,
                            "name": "Travel Expense",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        },
                        {
                            "id": 1312138,
                            "name": "Utilities",
                            "typeId": 8,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        }
                    ]
                },
                {
                    "label": "Owner's Drawings",
                    "children": [
                        {
                            "id": 1312106,
                            "name": "Owner's Draw",
                            "typeId": 9,
                            "parentId": null,
                            "accountCatLevel": 0,
                            "accountCatSetId": null
                        }
                    ]
                }
            ],
            "addressStreetAddress": "",
            "addressStreetAddress2": "",
            "addressCity": "",
            "addressState": "",
            "addressZip": "",
            "uiLoaded": true,
            "isVoided": false,
            "voidedAmount": null,
            "isVendorbill": false,
            "txtBtn1": "Save & Print",
            "userList": [
                {
                    "userId": 31152,
                    "userName": "Client Texting",
                    "isLoggedUser": false,
                    "userImageUrl": null
                },
                {
                    "userId": 34701,
                    "userName": "Performance TesterOne",
                    "isLoggedUser": true,
                    "userImageUrl": null
                },
                {
                    "userId": 34702,
                    "userName": "Performance TesterTwo",
                    "isLoggedUser": false,
                    "userImageUrl": null
                },
                {
                    "userId": 34703,
                    "userName": "Performance Tester Three",
                    "isLoggedUser": false,
                    "userImageUrl": null
                },
                {
                    "userId": 34704,
                    "userName": "Performance Tester Four",
                    "isLoggedUser": false,
                    "userImageUrl": null
                },
                {
                    "userId": 34705,
                    "userName": "Performance Tester Five",
                    "isLoggedUser": false,
                    "userImageUrl": null
                },
                {
                    "userId": 34706,
                    "userName": "Performance Tester Gmail",
                    "isLoggedUser": false,
                    "userImageUrl": null
                },
                {
                    "userId": 34707,
                    "userName": "Performance Time Entries",
                    "isLoggedUser": false,
                    "userImageUrl": null
                },
                {
                    "userId": 34708,
                    "userName": "Performance again tester 11",
                    "isLoggedUser": false,
                    "userImageUrl": null
                },
                {
                    "userId": 34709,
                    "userName": "new user",
                    "isLoggedUser": false,
                    "userImageUrl": null
                },
                {
                    "userId": 34710,
                    "userName": "Perf Test",
                    "isLoggedUser": false,
                    "userImageUrl": null
                }
            ],
            "expenseCodeList": [
                {
                    "expenseId": 1,
                    "expenseCode": "E101 Copying",
                    "firmId": null
                },
                {
                    "expenseId": 2,
                    "expenseCode": "E102 Outside printing",
                    "firmId": null
                },
                {
                    "expenseId": 3,
                    "expenseCode": "E103 Word processing",
                    "firmId": null
                },
                {
                    "expenseId": 4,
                    "expenseCode": "E104 Facsimile",
                    "firmId": null
                },
                {
                    "expenseId": 5,
                    "expenseCode": "E105 Telephone",
                    "firmId": null
                },
                {
                    "expenseId": 6,
                    "expenseCode": "E106 Online research",
                    "firmId": null
                },
                {
                    "expenseId": 7,
                    "expenseCode": "E107 Delivery services/messengers",
                    "firmId": null
                },
                {
                    "expenseId": 8,
                    "expenseCode": "E108 Postage",
                    "firmId": null
                },
                {
                    "expenseId": 9,
                    "expenseCode": "E109 Local travel",
                    "firmId": null
                },
                {
                    "expenseId": 10,
                    "expenseCode": "E110 Out-of-town travel",
                    "firmId": null
                },
                {
                    "expenseId": 11,
                    "expenseCode": "E111 Meals",
                    "firmId": null
                },
                {
                    "expenseId": 12,
                    "expenseCode": "E112 Court Fees",
                    "firmId": null
                },
                {
                    "expenseId": 14,
                    "expenseCode": "E113 Subpoena fees",
                    "firmId": null
                },
                {
                    "expenseId": 15,
                    "expenseCode": "E114 Witness fees",
                    "firmId": null
                },
                {
                    "expenseId": 16,
                    "expenseCode": "E115 Deposition transcripts",
                    "firmId": null
                },
                {
                    "expenseId": 17,
                    "expenseCode": "E116 Trial transcripts",
                    "firmId": null
                },
                {
                    "expenseId": 18,
                    "expenseCode": "E117 Trial exhibits",
                    "firmId": null
                },
                {
                    "expenseId": 19,
                    "expenseCode": "E118 Litigation support vendors",
                    "firmId": null
                },
                {
                    "expenseId": 20,
                    "expenseCode": "E119 Experts",
                    "firmId": null
                },
                {
                    "expenseId": 21,
                    "expenseCode": "E120 Private investigators",
                    "firmId": null
                },
                {
                    "expenseId": 22,
                    "expenseCode": "E121 Arbitrators/mediators",
                    "firmId": null
                },
                {
                    "expenseId": 23,
                    "expenseCode": "E122 Local counsel",
                    "firmId": null
                },
                {
                    "expenseId": 24,
                    "expenseCode": "E123 Other professionals",
                    "firmId": null
                },
                {
                    "expenseId": 25,
                    "expenseCode": "E124 Other",
                    "firmId": null
                },
                {
                    "expenseId": 47,
                    "expenseCode": "23430 quasi",
                    "firmId": 29419
                },
                {
                    "expenseId": 48,
                    "expenseCode": "46864 non",
                    "firmId": 29419
                }
            ],
            "autoSuggestAccountsEnabled": true,
            "accountingCategories": [
                {
                    "key": 1312089,
                    "value": "Misc Expense"
                },
                {
                    "key": 1312090,
                    "value": "Accounts Receivable"
                },
                {
                    "key": 1312091,
                    "value": "Undeposited Funds"
                },
                {
                    "key": 1312092,
                    "value": "Advanced Client Costs"
                },
                {
                    "key": 1312093,
                    "value": "Advanced Client Costs: Court Costs"
                },
                {
                    "key": 1312094,
                    "value": "Advanced Client Costs: Expert Witness Fees"
                },
                {
                    "key": 1312095,
                    "value": "Advanced Client Costs: Filing Fees"
                },
                {
                    "key": 1312096,
                    "value": "Furniture and Equipment"
                },
                {
                    "key": 1312097,
                    "value": "Accumulated Depreciation"
                },
                {
                    "key": 1312098,
                    "value": "Security Deposits Asset"
                },
                {
                    "key": 1312099,
                    "value": "Accounts Payable"
                },
                {
                    "key": 1312100,
                    "value": "Trust Liability Account"
                },
                {
                    "key": 1312101,
                    "value": "Payroll Liabilities"
                },
                {
                    "key": 1312102,
                    "value": "Retainer"
                },
                {
                    "key": 1312103,
                    "value": "Sales Tax Payable"
                },
                {
                    "key": 1312104,
                    "value": "Owner's Capital"
                },
                {
                    "key": 1312105,
                    "value": "Opening Balance Equity"
                },
                {
                    "key": 1312106,
                    "value": "Owner's Draw"
                },
                {
                    "key": 1312107,
                    "value": "Retained Earnings"
                },
                {
                    "key": 1312114,
                    "value": "Bad Debt / Write offs"
                },
                {
                    "key": 1312116,
                    "value": "Automobile Expense"
                },
                {
                    "key": 1312117,
                    "value": "Bank Service Charges"
                },
                {
                    "key": 1312118,
                    "value": "Computer and Internet Expenses"
                },
                {
                    "key": 1312119,
                    "value": "Continuing Legal Education (CLE)"
                },
                {
                    "key": 1312120,
                    "value": "Depreciation Expense"
                },
                {
                    "key": 1312121,
                    "value": "Dues and Subscriptions"
                },
                {
                    "key": 1312122,
                    "value": "Insurance Expense"
                },
                {
                    "key": 1312123,
                    "value": "Insurance Disability"
                },
                {
                    "key": 1312124,
                    "value": "Insurance Professional Liability"
                },
                {
                    "key": 1312125,
                    "value": "Insurance General Liability"
                },
                {
                    "key": 1312126,
                    "value": "Insurance Health"
                },
                {
                    "key": 1312127,
                    "value": "Interest Expense"
                },
                {
                    "key": 1312128,
                    "value": "Meals and Entertainment"
                },
                {
                    "key": 1312129,
                    "value": "Office Supplies"
                },
                {
                    "key": 1312130,
                    "value": "Payroll Expenses"
                },
                {
                    "key": 1312131,
                    "value": "Postage and Delivery"
                },
                {
                    "key": 1312132,
                    "value": "Professional Fees Expense"
                },
                {
                    "key": 1312133,
                    "value": "Rent Expense"
                },
                {
                    "key": 1312134,
                    "value": "Repairs and Maintenance"
                },
                {
                    "key": 1312135,
                    "value": "Research Services"
                },
                {
                    "key": 1312136,
                    "value": "Telephone Expense"
                },
                {
                    "key": 1312137,
                    "value": "Travel Expense"
                },
                {
                    "key": 1312138,
                    "value": "Utilities"
                },
                {
                    "key": 1312139,
                    "value": "Ask My Accountant"
                },
                {
                    "key": 1345014,
                    "value": "Asma_cc"
                },
                {
                    "key": 1345015,
                    "value": "perf test"
                }
            ]
        }
    };
    // Ensure saving is enabled so the server persists the check
    const resposne = await request.post(
        'https://qa.zolastaging.com/api2/checks/',
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
    // Basic HTTP success check
    expect(resposne.status()).toBe(201); 
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

export async function dateFormat() {
  const d = new Date();
  console.log("Current Date in UTC format: " + dayjs.utc(d).format('DD-MM-YYYY'));
  console.log("Current Date in UTC format: " + dayjs.utc(d).format('hh:mm:ss'));

}
