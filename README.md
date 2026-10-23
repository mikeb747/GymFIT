Strava API documentation is here; https://developers.strava.com/docs/

**Strava API details**
Athlete capacity of 10
Read read limits: 200 requests / 15min & 2,000 requests / day
Overall rate limits: 400 requests / 15min & 4,000 requests / day

Depending on the type of request, objects will be returned in meta, summary or detailed representations.

Requests that return multiple items will be paginated to 30 items by default. The page parameter can be used to specify further pages or offsets. The per_page may also be used for custom page sizes up to 200. Note that in certain cases, the number of items returned in the response may be lower than the requested page size, even when that page is not the last. If you need to fully go through the full set of results, prefer iterating until an empty page is returned.

**Dates and times follow the ISO 8601 standard, unless noted. A few examples:**
2015-08-23T15:46:20Z
2018-06-24T09:54:13-07:00

**Status codes**
Here is a list of our common status codes.
200 Successful request
201 Your activity/etc. was successfully created
401 Unauthorized
403 Forbidden; you cannot access
404 Not found; the requested asset does not exist, or you are not authorized to see it
429 Too Many Requests; you have exceeded rate limits
500 Strava is having issues, please check https://status.strava.com

**Request methods**
Where possible, API V3 strives to use appropriate HTTP verbs for each action.

HEAD can be issued against any resource to get just the HTTP header info
GET used for retrieving resources
POST used for creating resources, or performing custom actions
PUT used for updating or replacing resources
DELETE used for removing resources

**Strava API Documentation**
https://developers.strava.com/docs/reference/
https://developers.strava.com/playground/
