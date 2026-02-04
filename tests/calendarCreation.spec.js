import { test, expect, request } from '@playwright/test';
import { getAuthToken, getCookieHeader } from '../Util/helper.js';
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js'; // note the .js in some bundlers
dayjs.extend(utc);
import { createCalendarEntryAPI } from '../Util/calendar.js';

test("Creating Calendar Event through API", async ({request }) => {
  console.log("..........Creating Calendar Event through API..........");
  console.log("Step : Creating Calendar Event API");
  const authDetails = {
    webToken: await getAuthToken(),
    cookieHeader: await getCookieHeader()
  };

  const d = new Date();
  const postFixSub = d.toISOString().replace(/[-T:Z.]/g, "");
  const fromDate = dayjs.utc(d).format('MM/DD/YYYY hh:mm A');

  
  const payLoad = {
    "Subject": "SN Test Calendar Event API-" + postFixSub,
    // "FromDate": fromDate,   //Date Format 'MM/DD/YYYY hh:mm AM/PM'
    // "ToDate": toDate,       //Date Format 'MM/DD/YYYY hh:mm AM/PM'
    // "Duration": 30,         //Duration in Minutes
    // "MatterId": "1106208",
  };
  await createCalendarEntryAPI(request, authDetails, payLoad);
  console.log("Calendar Event has been created Successfully through API.");

});