/** Swaps performance budgets. Guardrails are the proposal's unless marked. */

/** Complete UTC days, ending at 00:00 UTC today. */
export const WINDOW_DAYS = 14;
export const MIN_SAMPLES = 400;

/** The SLACK_BOT_TOKEN bot must be a member of this channel. */
export const SLACK_CHANNEL_ID = 'C0CFMPG4KB9';

const MOBILE = '2299799';
const EXTENSION = '273505';
const MOBILE_MID_TIER = 'os.name:Android device.class:medium';

/**
 * Each query is the one its guardrail was derived with; changing a filter
 * means re-deriving the guardrail. `span.op` keeps out the same names under
 * other ops: `custom` on Extension before 13.52.0, `ui.load` and `custom` on
 * Mobile.
 */
export const BUDGET_RULES = [
  {
    // Not in the proposal: Oct 23 – Nov 6 p90 plus its headroom rule.
    label: 'Mobile Swap View Loaded (mid-tier Android)',
    projectId: MOBILE,
    query: `environment:production span.name:"Swap View Loaded" span.op:bridge.screen.performance result:success ${MOBILE_MID_TIER}`,
    guardrailMs: 1411,
  },
  {
    // Derived with no `span.op` or `result` filter, so other ops and failed searches count.
    label: 'Mobile Swap Token Search (mid-tier Android)',
    projectId: MOBILE,
    query: `environment:production span.name:"Swap Token Search" ${MOBILE_MID_TIER}`,
    guardrailMs: 1845,
  },
  {
    // Not in the proposal: Oct 23 – Nov 6 p90 plus its headroom rule.
    label: 'Mobile Swap Popular Tokens Fetch (mid-tier Android)',
    projectId: MOBILE,
    query: `environment:production span.name:"Swap Popular Tokens Fetch" span.op:bridge.data_fetch result:success ${MOBILE_MID_TIER}`,
    guardrailMs: 3489,
  },
  {
    // Derived with no `span.op` filter.
    label: 'Mobile Swap Quote Fetch (mid-tier Android)',
    projectId: MOBILE,
    query: `environment:production span.name:"Swap Quote Fetch" result:success ${MOBILE_MID_TIER}`,
    guardrailMs: 5199,
  },
  // Extension guardrails were derived with no `result` filter.
  {
    label: 'Extension Swap View Loaded',
    projectId: EXTENSION,
    query: 'environment:production span.name:"Swap View Loaded" span.op:bridge.screen.performance',
    guardrailMs: 2400,
  },
  {
    label: 'Extension Swap Token Search',
    projectId: EXTENSION,
    query: 'environment:production span.name:"Swap Token Search" span.op:bridge.data_fetch',
    guardrailMs: 965,
  },
  {
    label: 'Extension Swap Popular Tokens Fetch',
    projectId: EXTENSION,
    query: 'environment:production span.name:"Swap Popular Tokens Fetch" span.op:bridge.data_fetch',
    guardrailMs: 1810,
  },
  {
    label: 'Extension Swap Quote Fetch',
    projectId: EXTENSION,
    query: 'environment:production span.name:"Swap Quote Fetch" span.op:bridge.data_fetch',
    guardrailMs: 3385,
  },
];
