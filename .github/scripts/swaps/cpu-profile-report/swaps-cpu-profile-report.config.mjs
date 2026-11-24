/** The SLACK_BOT_TOKEN bot must be a member of this channel (#swaps-performance). */
export const SLACK_CHANNEL_ID = 'C0CFMPG4KB9';

/** Scheduled runs of this workflow on `main` produce the profiles. */
export const PERFORMANCE_WORKFLOW = 'run-performance-e2e-manual.yml';

/** This report's workflow; last week's run holds the baseline summary. */
export const REPORT_WORKFLOW = 'swaps-cpu-profile-report.yml';

/** Test titles as the performance specs declare them; the analyzer keys profiles on these. */
export const SCENARIOS = [
  {
    label: 'ETH swap',
    testName: 'Swap flow - ETH to LINK, SRP 1 + SRP 2 + SRP 3',
  },
  {
    label: 'Cross-chain swap',
    testName:
      'Cross-chain swap flow - ETH to SOL - 50+ accounts, SRP 1 + SRP 2 + SRP 3',
  },
];
