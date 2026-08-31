/* eslint-disable no-empty */
// TEMPORARY DEBUG INSTRUMENTATION — remove before merge.
// Fires fire-and-forget GET requests to the e2e CommandQueueServer at startup
// milestones so CI job logs show exactly where app startup stalls. Only the
// request *arrival* matters (server logs it), so this works even if the app's
// response handling / timers are broken.
import { hasTestOverrides, getCommandQueueServerPortInApp } from './utils';

let timerProbeScheduled = false;

export const startupBeacon = (marker: string): void => {
  if (!hasTestOverrides) return;
  try {
    const port = getCommandQueueServerPortInApp();
    const xhr = new XMLHttpRequest();
    xhr.open(
      'GET',
      `http://localhost:${port}/startup-marker?m=${encodeURIComponent(
        marker,
      )}&ts=${Date.now()}`,
    );
    xhr.send();
    if (!timerProbeScheduled) {
      timerProbeScheduled = true;
      setTimeout(() => startupBeacon('timers-alive-3s'), 3000);
    }
  } catch {}
};
