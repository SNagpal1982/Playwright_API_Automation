import { expect } from '@playwright/test';
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js'; // note the .js in some bundlers
import { getMatterDetails } from "./helper";
dayjs.extend(utc);

export async function createCalendarEntryAPI(request, authDetails, payLoad) {
    //Create New Flat Entry for the Matter
    const d = new Date();
    const postFixSub = d.toISOString().replace(/[-T:Z.]/g, "");
    const fromDate = dayjs.utc(d).format('MM/DD/YYYY hh:mm A');
    let toDate = d.setTime(d.getTime() + 30 * 60 * 1000);
    toDate = dayjs.utc(toDate).format('MM/DD/YYYY hh:mm A');

    if (!payLoad.OwnerId) payLoad.OwnerId = 34701;
    payLoad.PrivateAppointment = false;
    payLoad.GenerateTimeEntry = false;
    if (!payLoad.CategoryId) payLoad.CategoryId = 6200;
    if (!payLoad.Subject) payLoad.Subject = "Test Calendar Event API -" + postFixSub;
    if (!payLoad.Location) payLoad.Location = "Noida, Uttar Pradesh, India";
    if (!payLoad.Description) payLoad.Description = "SN Test Calendar Event Description";
    if (!payLoad.FromDate) payLoad.FromDate = fromDate;

    if (payLoad.Duration) {
        toDate = d.setTime(d.getTime() + payLoad.Duration * 60 * 1000);
        payLoad.ToDate = toDate;
    }
    else {
        payLoad.ToDate = toDate;
    }

    if (payLoad.MatterId) {
        const matterDetails = await getMatterDetails(request, payLoad.MatterId);
        console.log("Matter Name: " + matterDetails.matterName);
        console.log("Matter No: " + matterDetails.matterNumber);
    }
    payLoad.IsAllDay = false;
    payLoad.NotifyModeType = [];
    payLoad.NotifyInterval = [];
    payLoad.NotifyTimeType = [];
    payLoad.NotifyId = [];
    payLoad.NotifyModeTypeForAttendees = [];
    payLoad.NotifyIntervalForAttendees = [];
    payLoad.NotifyTimeTypeForAttendees = [];
    payLoad.NotifyIdForAttendees = [];
    payLoad.Participants = [];
    payLoad.IsCalendarImport = null;
    if (!payLoad.InternalAttendeesUserIds) payLoad.InternalAttendeesUserIds = [];
    payLoad.RecurrenceRule = null;
    payLoad.IsRecurrence = false;

    console.log("Calendar Event Payload: " + JSON.stringify(payLoad));
    
    // Ensure saving is enabled so the server persists the check
    const response = await request.post(
        'https://qa.zolastaging.com/api2/Calendar/',
        {
            headers: {
                accept: 'application/json, text/javascript, */*; q=0.01',
                authorization: `Bearer ${authDetails.webToken}`,
                'content-type': 'application/json',
                'x-requested-with': 'XMLHttpRequest',
                'svc-type': 'web',
                'Cookie': authDetails.cookieHeader
            },
            data: JSON.stringify(payLoad)
        }
    );
    // Basic HTTP success check
    expect(response.status()).toBe(200);
    console.log("Calendar Event has been created with below Details:");
    console.log("Event Subject: " + payLoad.Subject);
    console.log("Start time : " + payLoad.FromDate);
    console.log("End time : " + payLoad.ToDate);
    const durationMinutes = dayjs(payLoad.ToDate).diff(dayjs(payLoad.FromDate), 'minute');
    console.log("Duration (in minutes) : " + durationMinutes);
}    