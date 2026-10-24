Current Fitness and Progress Tracking

The app should maintain a current performance profile for running, swimming and cycling, using recent activities, race results and manually entered benchmarks.
- Running: Estimated race times, threshold pace and distance-specific performance.
- Swimming: Critical Swim Speed (CSS), pool performance and open-water benchmarks.
- Cycling: FTP, Critical Power, power-duration profile and benchmark speeds.
Each benchmark should retain its date, source and confidence level. Older results should gradually become less influential as more recent performance data becomes available.

ccccccccccccccccccccccccccccccccccccccccccccccccccdddddddddddddddddddddddddddddddddddddddddddddddddd


1. Swimming – maintaining current ability
For swimming, I'd maintain two separate performance estimates:

Pool swimming
- Critical Swim Speed (CSS), expressed as pace per 100m.
- Predicted times for common distances: 400m, 750m, 1,500m and 3,000m.
- Pool length (25m or 50m).
CSS is particularly useful because it estimates sustainable swimming pace rather than relying on the average pace of an ordinary training session.

It can be calculated from a 200m and 400m time trial:
\[
CSS = \frac{T_{400}-T_{200}}{2}
\]

The result is expressed in seconds per 100m.

Open-water swimming
- Recent race results.
- Manually entered benchmark swims.
- Average pace over known distances.
I'd keep pool and open-water ability separate. Open-water pace is affected by sighting, currents, waves and conditions, so it isn't directly interchangeable with pool pace.

Suggested implementation:
Metric	Example
CSS pace	1:40 / 100m
400m estimated	6:32
750m estimated	12:45
1,500m estimated	26:00
Open-water benchmark	1:45 / 100m

These are illustrative values, not necessarily predictions that should be derived from CSS alone without accounting for distance and endurance.


2. Cycling – maintaining current ability
Cycling is where I'd put more thought into the underlying performance model.
With a power meter
I'd prioritise power-based measurements over speed.

Useful metrics include:
- FTP (Functional Threshold Power).
- Critical Power (CP), if supported.
- Power-duration curve.
- 5-minute, 20-minute and 60-minute power.
- Average power and normalised power from longer efforts.
FTP provides a useful measure of sustainable cycling performance, while the power-duration curve gives a better indication of capabilities across shorter and longer efforts.

For example:
Metric	Current ability
FTP	280 W
5-minute power	350 W
20-minute power	295 W
60-minute power	265 W

The app could use these benchmarks to estimate performance over different cycling distances.

I wouldn't automatically treat every training activity as an FTP test. Estimates should preferentially use genuine maximal efforts, structured tests and race results.

I would keep indoor trainer performance separate from outdoor speed-based benchmarks.

3. How to combine the three sources of performance data
I'd use a common approach across all disciplines.
Source	How it is used
Recent activities	Automatically identify performance benchmarks
Race results	Record actual achieved performance
Manual benchmarks	Allow users to enter tests or known ability

Each benchmark should also store:
- Date achieved.
- Source (activity, race or manual).
- Performance metric and value.
- Relevant conditions and equipment.
- Confidence level.
I'd also use recency weighting. A race result from two years ago shouldn't carry the same importance as a recent performance test.

Importantly, I'd distinguish between an actual result and an estimated ability. A user completing a 1,500m swim in 25 minutes is different from the app estimating that they could currently swim it in 25 minutes.


4. My suggested implementation structure
I'd maintain the following performance profile:
Discipline	Primary performance metrics
Run	Race-equivalent times, threshold pace
Swim	CSS, pool pace, open-water pace
Bike	FTP, power-duration curve, benchmark speeds

Then use these profiles when assessing individual goals.

For example, a triathlon goal could show:
Current performance vs event targets

Illustrative example
Swim

Ahead

Current: 1:40 / 100m

Target: 1:45 / 100m


Bike

Development needed

Current: 280 W FTP

Target: 300 W FTP


Run

Development needed

Current: 40:00 10km

Target: 38:30 10km


I'd avoid comparing these metrics directly to one another. Instead, assess each discipline against its own target and eventually use the combined results to estimate overall race readiness.
