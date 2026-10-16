# Bug log

This log tracks confirmed behavior issues noted during code review. Items remain
open until fixed and verified.

## Open

### High: Strava client secret is exposed in frontend code

- **Location:** `src/utils/stravaOAuth.ts`; the default client secret is bundled
  with the browser app and used during OAuth token exchange.
- **Observed:** Anyone with access to the deployed app can inspect its frontend
  code and retrieve the client secret.
- **Current scope:** A single connection is sufficient during development, and
  use of this code is currently limited to the developer. This exposure is
  acknowledged for that development-only use.
- **Expected before broader use:** Rotate the exposed secret and move OAuth code
  exchange and secret handling to a server-side endpoint. Upgrade the Strava API
  connection before allowing other users or a wider deployment.

### Medium: Expired Strava access tokens are not refreshed

- **Location:** `src/utils/stravaOAuth.ts` (token persistence); upload entry points
  in `src/utils/stravaUpload.ts` and `src/App.tsx`.
- **Observed:** OAuth saves the refresh token and access-token expiry, but uploads
  use the saved access token without checking its expiry or refreshing it. The UI
  can therefore continue to show a connection that can no longer upload.
- **Expected:** Refresh an expired access token through the server, save the
  returned access token, refresh token, and expiry, then retry the upload or
  report a clear reconnection error.

### Low: FIT set timeline can end before the workout end time

- **Location:** `src/utils/fitGenerator.ts`, set timeline construction.
- **Observed:** Time scaling includes each set's rest period, including the last
  set, but a rest FIT record is emitted only between sets. The final rest is
  therefore included in the scale but omitted from the generated timeline.
- **Expected:** Scale against only the durations represented in the FIT timeline,
  or otherwise ensure the generated timeline ends at the workout end time.
