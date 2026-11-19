/** Complete UTC days, ending at 00:00 UTC today. */
export const WINDOW_DAYS = 14;
export const MIN_SAMPLES = 400;

/** The SLACK_BOT_TOKEN bot must be a member of this channel. */
export const SLACK_CHANNEL_ID = 'C0CFMPG4KB9';

const MOBILE = '2299799';
const EXTENSION = '273505';

/** Each client's Swap & Bridge Performance dashboard, linked from its Slack heading. */
export const SENTRY_DASHBOARDS = {
  Mobile: { dashboardId: '9580363', projectId: MOBILE },
  Extension: { dashboardId: '10089240', projectId: EXTENSION },
};
const MOBILE_MID_TIER = 'os.name:Android device.class:medium';

/**
 * Each query is the one its guardrail was derived with; changing a filter
 * means re-deriving the guardrail. `span.op` keeps out the same names under
 * other ops: `custom` on Extension before 13.52.0, `ui.load` and `custom` on
 * Mobile.
 *
 * Guardrail provenance:
 * - Mobile View Loaded and Popular Tokens Fetch: not in the proposal; Oct 23 – Nov 6 p90 plus its headroom rule.
 * - Mobile Token Search and Quote Fetch, re-derived Nov 9: Oct 12–26 p90 + 25% and + 15%.
 * - Extension, re-derived Nov 9: Oct 12–26 p90 + 50%.
 */
export const BUDGET_RULES = [
  {
    label: 'Mobile Swap View Loaded (mid-tier Android)',
    projectId: MOBILE,
    query: `environment:production span.name:"Swap View Loaded" span.op:bridge.screen.performance result:success ${MOBILE_MID_TIER}`,
    guardrailMs: 1411,
  },
  {
    label: 'Mobile Swap Token Search (mid-tier Android)',
    projectId: MOBILE,
    query: `environment:production span.name:"Swap Token Search" span.op:bridge.data_fetch result:success ${MOBILE_MID_TIER}`,
    guardrailMs: 1810,
  },
  {
    label: 'Mobile Swap Popular Tokens Fetch (mid-tier Android)',
    projectId: MOBILE,
    query: `environment:production span.name:"Swap Popular Tokens Fetch" span.op:bridge.data_fetch result:success ${MOBILE_MID_TIER}`,
    guardrailMs: 3489,
  },
  {
    label: 'Mobile Swap Quote Fetch (mid-tier Android)',
    projectId: MOBILE,
    query: `environment:production span.name:"Swap Quote Fetch" span.op:bridge.data_fetch result:success ${MOBILE_MID_TIER}`,
    guardrailMs: 5218,
  },
  {
    label: 'Extension Swap View Loaded',
    projectId: EXTENSION,
    query:
      'environment:production span.name:"Swap View Loaded" span.op:bridge.screen.performance result:success',
    guardrailMs: 2395,
  },
  {
    label: 'Extension Swap Token Search',
    projectId: EXTENSION,
    query:
      'environment:production span.name:"Swap Token Search" span.op:bridge.data_fetch result:success',
    guardrailMs: 985,
  },
  {
    label: 'Extension Swap Popular Tokens Fetch',
    projectId: EXTENSION,
    query:
      'environment:production span.name:"Swap Popular Tokens Fetch" span.op:bridge.data_fetch result:success',
    guardrailMs: 1685,
  },
  {
    label: 'Extension Swap Quote Fetch',
    projectId: EXTENSION,
    query:
      'environment:production span.name:"Swap Quote Fetch" span.op:bridge.data_fetch result:success',
    guardrailMs: 3125,
  },
];
