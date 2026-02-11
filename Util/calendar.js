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

    console.log("Creating Calendar Event with Payload: " + JSON.stringify(payLoad));

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
    
    const calendarEntry = await response.json();
    console.log("Calendar Event has been created with below Details:");
    console.log("Calendar Event ID: " + calendarEntry.id);
    console.log("Event Subject: " + (calendarEntry.subject || payLoad.Subject));
    console.log("Start time : " + (calendarEntry.fromDateString || payLoad.FromDate));
    console.log("End time : " + (calendarEntry.toDateString || payLoad.ToDate));
    
    if (calendarEntry.fromDateString && calendarEntry.toDateString) {
        const durationMinutes = dayjs(calendarEntry.toDateString).diff(dayjs(calendarEntry.fromDateString), 'minute');
        console.log("Duration (in minutes) : " + durationMinutes);
    }
    
    return calendarEntry;
}

export async function getCalendarListAPI(request, authDetails, payLoad = {}, options = {}) {
  const params = {};
  const set = (k, v) => { if (v !== undefined && v !== null && v !== '') params[k] = String(v); };

  set('StartDateRange', options.StartDateRange);
  set('EndDateRange', options.EndDateRange);
  set('pageSize', options.pageSize || 10000);
  set('format',  options.format || 'json');
  if (options.ownerList) set('OwnerList', options.ownerList);
  if (options.categoryListFilter) set('CategoryListFilter', options.categoryListFilter);
  set('Iskendo', options.isKendo || true);
  set('IsFromEdit', options.isFromEdit || false);

  const qs = new URLSearchParams(params).toString();
  const url = `https://qa.zolastaging.com/API2/CALENDAR${qs ? `?${qs}` : ''}`;
  console.log("Fetching Calendar List with URL: " + url);

    const response = await request.get(url, {
    headers: {
      accept: 'application/json, text/javascript, */*; q=0.01',
      'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7',
      authorization: `Bearer ${authDetails.webToken}`,
      'x-requested-with': 'XMLHttpRequest',
      'svc-type': 'web',
      Cookie: authDetails.cookieHeader,
    }
  });

  if (response.status() !== 200) {
    const body = await response.text();
    console.error('getCalendarListAPI failed. status=', response.status(), 'body:', body.slice(0, 2000));
    throw new Error(`Calendar list fetch failed: ${response.status()}`);
  }

  const contentType = (response.headers()['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    const body = await response.text();
    console.error('Expected JSON but got:', body.slice(0, 2000));
    throw new Error('Calendar list returned non-JSON response');
  }

  const data = await response.json();
//   console.log("Calendar List fetched successfully."  +JSON.stringify(data));
//   console.log('Calendar List fetched. Total records:', Array.isArray(data) ? data.length : (data && data.recordCount) || 0);
  return { raw: data, count: Array.isArray(data) ? data.length : (data && data.recordCount) || null };
}