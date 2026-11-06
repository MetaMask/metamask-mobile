/**
 * Swaps performance budgets, as signed off in the Swaps performance budgets
 * proposal. Edit this file to re-baseline a guardrail, change a headroom or
 * turn the timeout exclusion on; `swaps-perf-budgets.mjs` reads nothing else.
 */

export const TIME_ZONE = 'Europe/Berlin';

/** The budget window: this many complete days, ending at 00:00 today. */
export const WINDOW_DAYS = 14;

/** Below this many samples a p90 is reported as not evaluable, not compared. */
export const MIN_SAMPLES = 400;

/**
 * Adds `span.duration:<TIMEOUT_MS` to every query. Off: the proposal does not
 * exclude timed-out spans at p90.
 */
export const EXCLUDE_TIMEOUTS = false;
export const TIMEOUT_MS = 300_000;

/** How far back the per-release check looks for the two newest versions. */
export const RELEASE_LOOKBACK_DAYS = 30;

export const MOBILE_PROJECT_ID = '2299799';
export const EXTENSION_PROJECT_ID = '273505';

const MOBILE_MID_TIER = 'os.name:Android device.class:medium';

/**
 * `guardrailMs`: the 14-day p90 alert threshold.
 * `releaseHeadroom`: how much slower a new release's p90 may be than the
 * previous release's, over the same dates, before it is flagged.
 * `perRelease`: whether the per-release check runs for the rule.
 *
 * Extension filters need their `span.op`: releases before 13.52.0 emit the
 * same span names under `custom`.
 */
export const BUDGET_RULES = [
  {
    id: 'mobile-swap-quote-fetch',
    label: 'Mobile Swap Quote Fetch (mid-tier Android)',
    projectId: MOBILE_PROJECT_ID,
    query: `environment:production span.name:"Swap Quote Fetch" result:success ${MOBILE_MID_TIER}`,
    guardrailMs: 5199,
    releaseHeadroom: 0.15,
    perRelease: true,
  },
  {
    id: 'mobile-swap-token-search',
    label: 'Mobile Swap Token Search (mid-tier Android)',
    projectId: MOBILE_PROJECT_ID,
    query: `environment:production span.name:"Swap Token Search" ${MOBILE_MID_TIER}`,
    guardrailMs: 1845,
    releaseHeadroom: 0.25,
    perRelease: true,
  },
  {
    id: 'extension-swap-quote-fetch',
    label: 'Extension Swap Quote Fetch',
    projectId: EXTENSION_PROJECT_ID,
    query:
      'environment:production span.name:"Swap Quote Fetch" span.op:bridge.data_fetch',
    guardrailMs: 3385,
    releaseHeadroom: 0.5,
    perRelease: false,
  },
  {
    id: 'extension-swap-view-loaded',
    label: 'Extension Swap View Loaded',
    projectId: EXTENSION_PROJECT_ID,
    query:
      'environment:production span.name:"Swap View Loaded" span.op:bridge.screen.performance',
    guardrailMs: 2400,
    releaseHeadroom: 0.5,
    perRelease: false,
  },
  {
    id: 'extension-swap-popular-tokens-fetch',
    label: 'Extension Swap Popular Tokens Fetch',
    projectId: EXTENSION_PROJECT_ID,
    query:
      'environment:production span.name:"Swap Popular Tokens Fetch" span.op:bridge.data_fetch',
    guardrailMs: 1810,
    releaseHeadroom: 0.5,
    perRelease: false,
  },
  {
    id: 'extension-swap-token-search',
    label: 'Extension Swap Token Search',
    projectId: EXTENSION_PROJECT_ID,
    query:
      'environment:production span.name:"Swap Token Search" span.op:bridge.data_fetch',
    guardrailMs: 965,
    releaseHeadroom: 0.5,
    perRelease: false,
  },
  {
    id: 'extension-bridge-balances-updated',
    label: 'Extension Bridge Balances Updated',
    projectId: EXTENSION_PROJECT_ID,
    query:
      'environment:production span.name:"Bridge Balances Updated" span.op:bridge.data_fetch',
    guardrailMs: 875,
    releaseHeadroom: 0.5,
    perRelease: false,
  },
];
