# Strava API and Activity Data

Strava API documentation:

- [API reference](https://developers.strava.com/docs/reference/)
- [API Playground](https://developers.strava.com/playground/)
- [Upload documentation](https://developers.strava.com/docs/uploads/)

## API limits and response representations

The current limits documented for an athlete are 200 read requests per 15
minutes and 2,000 read requests per day. Overall limits are 400 requests per 15
minutes and 4,000 per day. These limits can change; check Strava's API
documentation for the latest values.

Strava returns meta, summary, or detailed representations depending on the
endpoint. Collection endpoints return arrays and use pagination. Dates are
generally ISO 8601 unless an endpoint specifies otherwise.

## Reading activities

### List activities

`GET /athlete/activities` returns an array of `SummaryActivity` objects for the
authenticated athlete. It requires `activity:read`; Only Me activities are
included only when the token also has `activity:read_all`.

Supported query parameters:

| Parameter | Meaning |
|---|---|
| `before` | Filter to activities before this Unix epoch timestamp (seconds). |
| `after` | Filter to activities after this Unix epoch timestamp (seconds). |
| `page` | Page number; starts at `1`. |
| `per_page` | Number of results per page; defaults to `30`, maximum `200`. |

`before` and `after` can be combined to bound a date range. For incremental
syncs, `after` can be set to the last successful sync time, with overlap if the
client needs to account for delayed or edited activities.

Strava's default page size is 30. Increasing `per_page` to between 30 and 200
can reduce the number of HTTP requests needed to read a large history, which
helps reduce request overhead and rate-limit usage. Larger pages return more
data per response and use more bandwidth and memory, so use a size suitable
for the client; larger pages are useful for bulk history reads, while smaller
pages can be preferable for incremental or memory-constrained reads.

Do not infer that the last page has been reached just because a page contains
fewer activities than requested. Strava may return fewer than `per_page` even
when later results exist. Continue through pages until the response is empty.

### Estimating API requests

One `GET /athlete/activities` request can return up to 200 activities when
`per_page=200`. Listing 200 activities does not require 200 requests. Each
additional endpoint call is a separate request, however, so fetching optional
per-activity data can add up quickly:

| Work | Requests |
|---|---:|
| List activities | `L` list-page requests; one can return up to 200 |
| Fetch activity details | One `GET /activities/{id}` per activity needing details |
| Fetch laps separately | One `GET /activities/{id}/laps` per activity needing laps |
| Update activities | One `PUT /activities/{id}` per activity being changed |
| Fetch streams | One `GET /activities/{id}/streams` per activity needing streams |

For `D` activities needing details, `P` separate lap lookups, `U` activities
to update, and `S` activities needing streams, the total is
`L + D + P + U + S` requests. List/detail/lap/stream calls are reads; PUT calls
are writes and count toward the overall request limit.

For example, one list request returning 200 activities, details for 12
activities, updates to 3 activities, and streams for 10 activities is
`1 + 12 + 3 + 10 = 26` requests when lap data comes from the detail responses.
Each streams request can include multiple keys, so requesting time, distance,
altitude, heart rate, cadence, power, and temperature for one activity is still
one streams request—not seven. If the 12 lap sets are instead fetched through
the separate laps endpoint, add 12 more requests.

Use `ceil(number of activities / 200)` as the minimum number of list-page
requests when retrieving a known-sized collection. In practice, keep paging
until Strava returns an empty response, as described above. Request only the
per-activity data the app actually needs.

### Get one activity: summary versus detailed

`GET /activities/{id}` returns a `DetailedActivity` for an activity owned by
the authenticated athlete. It requires `activity:read` for Everyone and
Followers activities, and `activity:read_all` for Only Me activities. The
optional `include_all_efforts=true` query parameter includes all segment
efforts.

The detailed representation includes the summary activity fields and adds
information useful when opening an individual activity:

| `GET /athlete/activities` (`SummaryActivity`) | `GET /activities/{id}` (`DetailedActivity`) |
|---|---|
| ID, name, sport/type, start date and timezone | All summary fields |
| Distance, elapsed/moving time, elevation, speed and available summary metrics | Description |
| Athlete and location metadata, map, kudos/comment/achievement counts | Gear object |
| Upload/device metadata and activity flags | Calories |
|  | Laps |
|  | Metric and standard splits |
|  | Segment efforts and best efforts |
|  | Photos and embed token |

The list endpoint is appropriate for browsing, filtering, and building an
activity index. Fetch the detailed endpoint when the app needs the extra
per-activity fields, rather than fetching details for every activity by
default. A detailed response already includes a `laps` array, so when details
are fetched there is usually no need for an additional laps request. The
separate laps endpoint is useful when lap data is needed without fetching
other detailed fields. The API documents the embedded laps and the separate
laps endpoint as the same `Lap` representation; it does not document
additional lap fields available only from the separate endpoint. The separate
endpoint is an alternative way to retrieve the laps array, not a richer lap
resource. A successful PUT also returns a detailed activity; use that
response to refresh local details instead of immediately issuing an extra GET.

### Update an activity

`PUT /activities/{id}` updates an activity owned by the authenticated athlete
and requires `activity:write`. Updating an Only Me activity also requires
`activity:read_all`. The request body uses Strava's `UpdatableActivity`
model; the response is a `DetailedActivity`.

The fields include:

- `name` — activity name
- `description` — activity description
- `gear_id` — associated gear ID; use `"none"` to clear the gear
- `commute`, `trainer`, `hide_from_home`
- `tags` — supported tags are `WithPet`, `Recovery`, `Competition`,
  `ForACause`, and `Commute`
- `sport_type` — preferred over the deprecated `type`

For example, the fields requested for a name, description, and gear change can
be sent as:

```json
{
  "name": "Evening ride",
  "description": "Steady ride after work.",
  "gear_id": "b123456"
}
```

Tags are updated by supplying boolean values for the tags being changed; tags
omitted from the request remain unchanged. Strava rejects unsupported tags.

### Get activity laps

`GET /activities/{id}/laps` returns an array of lap objects. A lap can provide
its own timing, distance, elevation, speed, and cadence metrics, plus
`start_index` and `end_index` that locate that lap within the activity's
streams. Reading laps requires `activity:read` for Everyone and Followers
activities, and `activity:read_all` for Only Me activities.

Example response:

```json
[
  {
    "id": 12345678987654320,
    "resource_state": 2,
    "name": "Lap 1",
    "activity": {
      "id": 12345678987654320,
      "resource_state": 1
    },
    "athlete": {
      "id": 12345678987654320,
      "resource_state": 1
    },
    "elapsed_time": 1691,
    "moving_time": 1587,
    "start_date": "2018-02-08T14:13:37Z",
    "start_date_local": "2018-02-08T06:13:37Z",
    "distance": 8046.72,
    "start_index": 0,
    "end_index": 1590,
    "total_elevation_gain": 270,
    "average_speed": 4.76,
    "max_speed": 9.4,
    "average_cadence": 79,
    "device_watts": true,
    "average_watts": 228.2,
    "lap_index": 1,
    "split": 1
  }
]
```

Fields depend on the activity and available sensor data; for example, power
fields may be absent when power data is unavailable. IDs in Strava responses
can be 64-bit integers; clients should not do arithmetic on them and should
take care not to lose precision when handling them in JavaScript.

## Activity streams

`GET /activities/{id}/streams` returns time-series data for a single activity.
Reading streams requires `activity:read` for Everyone and Followers
activities, and `activity:read_all` for Only Me activities. The query
parameters select the streams and their returned shape/detail:

| Parameter | Meaning |
|---|---|
| `id` | Activity ID in the path. |
| `keys` | Required array of desired stream types, such as `time`, `watts`, and `heartrate`. |
| `key_by_type` | Required; set to `true` to return a `StreamSet` keyed by stream name. |
| `resolution` | Requested sampling detail: `low`, `medium`, or `high`. |
| `series_type` | Base series for downsampling: `time` or `distance`. |

One request can ask for multiple streams by including multiple values in
`keys`. The response is one `StreamSet` containing a separate stream object
for each requested, available type; it is not one response/request per stream.
For example, request the seven core analysis streams together:

```text
GET /activities/{id}/streams?keys=time,distance,altitude,heartrate,cadence,watts,temp&key_by_type=true
```

The `StreamSet` may contain `time`, `distance`, `latlng`, `altitude`,
`velocity_smooth`, `heartrate`, `cadence`, `watts`, `temp`, `moving`, and
`grade_smooth` streams. These types are available to request, but individual
streams may be absent if Strava has no corresponding data for that activity.

Each stream contains `data` and metadata:

- `original_size` — number of data points in the stream
- `resolution` — returned sampling detail (`low`, `medium`, or `high`)
- `series_type` — the base series used for downsampling (`time` or `distance`)
- `data` — values for the selected stream

For example, a power stream's `data` values are integer watts (`PowerStream`).
A heart-rate stream's values are integer beats per minute. When requesting the
`time` stream, its values are elapsed seconds and can be used to position each
sample relative to the activity start. Use corresponding sample positions to
plot power and heart rate together, compare effort over time, and relate stream
samples to lap `start_index`/`end_index` ranges. Streams can be downsampled, so
check their `resolution` and `series_type` when comparing or aggregating data.

### Possible uses for the streams

- `time` provides elapsed seconds, and `distance` provides meters. They can be
  used for chart axes, locating samples in a workout, and relating stream data
  to lap index ranges.
- `velocity_smooth` provides speed in meters per second. It can drive a speed
  chart or be converted to pace (for running, seconds per kilometer are
  `1000 / speed`; for swimming, seconds per 100 meters are `100 / speed`),
  when speed is greater than zero. GymFIT already uses this stream for its
  pace/speed chart and pace-zone analysis.
- `moving` is a boolean stream that could be used to distinguish moving
  samples from stopped samples, for example when calculating moving-only
  speed or excluding stops from a pace summary. GymFIT currently requests this
  stream but does not use it in its charts or calculations. Apply it only to
  analyses where stopped samples should be excluded; stopped heart rate or
  zero power can still be meaningful.
- `grade_smooth` provides smoothed grade percentages. It could help visualize
  climbs or compare speed with terrain. Grade-adjusted pace requires a
  validated model; do not infer training metrics from an ad hoc grade formula.
- `heartrate`, `watts`, and `cadence` provide sample-by-sample physiological
  or performance data for time-series charts and zone analysis. Summary
  fields such as `average_heartrate` and `average_watts` provide activity-level
  averages instead.
- `altitude` can show elevation changes; `latlng` can map the route;
  `temp` can show recorded temperature; and `moving` can also help identify
  stopped sections when inspecting those time series.

Streams may be downsampled, and some may be absent for an activity. Before
combining data arrays, check their lengths and metadata (`resolution` and
`series_type`) to ensure their samples are comparable. Do not assume missing
or stopped values are equivalent to zero.

The [API Playground](https://developers.strava.com/playground/) is useful for
trying these endpoints and inspecting the response shapes before implementing
requests in a client.
