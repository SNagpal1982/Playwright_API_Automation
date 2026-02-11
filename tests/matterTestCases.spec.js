import { test, expect, request } from '@playwright/test';
import { getAuthToken, getCookieHeader } from '../Util/helper.js';
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js'; // note the .js in some bundlers
dayjs.extend(utc);
import { createMatterAPI,  getMatterDetails, getMatterList} from '../Util/matter.js';
import { dateFormat } from '../Util/helper.js';

test("Get Matter List", async ({ request }) => {
  console.log("Step : Get Matter List API");
  const authDetails = {
    webToken: await getAuthToken(),
    cookieHeader: await getCookieHeader()
  };

  const d = new Date();
  const postFixSub = d.toISOString().replace(/[-T:Z.]/g, "");
  const fromDate = dayjs.utc(d).format('MM/DD/YYYY hh:mm A');

  const payLoad = {
    "pageNumber": 1,
    "pageSize": 50,
    "sortItem": "matt_id",
    "sortOrder": "Descending",
    "Filters": [
      {
        "FilterType": 0,
        "FilterItems": [
          {
            "Name": "MatterStatusId",
            "Value": "1"
          }
        ]
      }
    ],
    "sortType": 0
  };
  // const response = await getMatterList(request, authDetails, payLoad);

  dateFormat();


});