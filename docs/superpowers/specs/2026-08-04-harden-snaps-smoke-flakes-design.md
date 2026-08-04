# Harden Appium Snaps Smoke Tests Design

## Goal

Reduce the highest-frequency Appium Snaps smoke-test flakes by hardening shared alert handling, background-event synchronization, and Snap Settings navigation without adding blanket retries, skips, or per-test device restarts.

## Evidence and scope

The design is based on 52 Playwright reports from main CI over the preceding 24 hours.

The highest-impact observed failures were:

- `fails when choosing an invalid entropy source` on iOS: every failed attempt ended while locating an `OK` control whose accessibility label did not exactly match `OK`.
- `schedules a background event with an ISO 8601 date string` on Android: the expected event dialog did not appear during the assertion window.
- `schedules, lists, and cancels a background event` on Android: either the suite exhausted its timeout or the newly scheduled event was not visible before the assertion.
- `can enable a Snap` on Android: the serial test exhausted its 150-second timeout while navigating between Snap Settings and the browser.
- Retry failures of `can connect to the Dialog Snap`: wallet-home readiness was not restored after the prior test left the reused session in a bad state.

This change addresses those shared failure points. It does not attempt to fix manage-state result serialization, UiAutomator process failures, or unrelated infrastructure timeouts.

## Design

### 1. Unify Snap alert dismissal

`TestSnaps.tapOkButton()` already accepts both `OK` and the Snap UI accessibility form `I, OK`, but `TestSnaps.dismissAlert()` only accepts an exact `OK`. The methods will share one matcher that accepts the known accessibility variants.

`dismissAlert()` will wait for and tap the control using the existing Snap UI tap options. It will continue to tolerate only races that mean the alert has already disappeared or the element became stale. Timeouts and unexpected WebDriver errors will remain test failures.

No individual spec will add a local matcher or an unconditional catch. Existing invalid-entropy and disabled-Snap cases will benefit from the shared behavior.

### 2. Synchronize background-event tests with observable state

The ISO date test currently computes a timestamp only 30 seconds ahead, then performs WebView input and tap operations before waiting for the event. Slow Android execution can consume most of that offset.

The test will:

1. Increase the future-date offset to a value that remains safely in the future under slow CI execution.
2. Compute the timestamp immediately before entering and submitting it.
3. Assert that scheduling produced a non-empty result before waiting for the event dialog.
4. Wait through the scheduled offset plus a bounded delivery buffer.
5. Include the scheduled timestamp and current timestamp in a failure message so a late submission can be distinguished from an event that never fired.

The schedule/list/cancel test will use polling for the scheduled event to appear rather than relying on a short one-shot result assertion. Cancellation will be verified by polling until the event list is empty. The test will retain its one-hour duration so the event cannot fire during cleanup.

The suite remains serial because later tests intentionally reuse the installed Snap and Appium session.

### 3. Add explicit readiness boundaries to Snap Settings navigation

The navigation helpers will stop assuming that closing the browser immediately exposes usable wallet controls.

`navigateFromBrowserToSnapSettings()` will wait for the wallet home to be ready after closing the browser and before opening the account menu. It will use the existing `waitForWalletHomePlaywright()` readiness helper, which handles Android overlays and platform-specific readiness indicators.

`navigateFromSnapSettingsToBrowser()` will retain its existing screen-level assertions and add an explicit readiness check before interacting with the tab bar after returning from Settings. The final `waitForTestSnapsToLoad()` remains the browser-side completion boundary.

Snap enable/disable behavior will also be confirmed after toggling before navigating away, using the toggle's accessible state or a stable enabled/disabled screen indicator. This prevents a tap that was accepted by Appium but not applied by the app from surfacing later as an unrelated browser timeout.

## Error handling and diagnostics

- Missing or stale alert controls may be ignored only when the alert has already disappeared.
- An alert that never exposes an accepted dismissal control remains a hard failure.
- Background-event failures report the requested fire time, observation deadline, and current time.
- Navigation failures identify the readiness boundary that failed: wallet home, Settings, Snap list/details, or Test Snaps page.
- The implementation will not introduce arbitrary sleeps. Synchronization uses assertions and polling against observable UI or result state.

## Testing

Unit tests will cover any extracted matcher or polling behavior that can be tested without a device. Existing page-object and flow tests will be extended where an established test harness exists.

Targeted Appium validation will run:

- iOS: `fails when choosing an invalid entropy source`
- Android: background-event date and schedule/list/cancel cases
- Android: the complete serial Snap Management suite

Each targeted test will be repeated enough times to exercise session reuse and delayed CI-like execution. The final verification will include TypeScript and formatting checks for changed files.

## Success criteria

- The invalid-entropy iOS case can dismiss both `OK` and `I, OK` alert controls.
- Background-event tests wait on successful scheduling and eventual state instead of fixed execution speed.
- Snap Settings navigation does not interact with wallet controls before wallet readiness is established.
- No blanket retries, skipped tests, or per-test device restarts are added.
- Existing passing Snaps cases retain their current behavior.

## Non-goals

- Quarantining or skipping flaky tests.
- Increasing Playwright retries globally.
- Restarting the app before every serial Snaps test.
- Repairing UiAutomator/Appium server crashes.
- Changing Snap runtime behavior in the application.
