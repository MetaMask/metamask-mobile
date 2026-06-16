/**
 * Performance Test Tags for Playwright tests.
 *
 * These tags are area-specific and tool-agnostic, matching the tags defined in e2e/tags.js.
 * Use these tags to categorize and filter performance tests.
 *
 * Usage in tests:
 *   import { Performance, System, PerformanceLogin, PerformanceSwaps } from '../../tags.performance.js';
 *
 *   // Both perf and system test (most common):
 *   test.describe(`${Performance} ${System} ${PerformanceLogin} ${PerformanceSwaps}`, () => { ... });
 *
 *   // System-only test (functional verification, no perf measurement):
 *   test.describe(`${System} ${PerformanceLogin}`, () => { ... });
 *
 *   // Perf-only test (not run in system test suite):
 *   test.describe(`${Performance} ${PerformanceLaunch}`, () => { ... });
 *
 * Running tests with tags:
 *   yarn playwright test --grep "@Performance"          # All performance tests
 *   yarn playwright test --grep "@System"               # All system tests
 *   yarn playwright test --grep "@PerformanceLogin"     # By area
 *   yarn playwright test --grep "@PerformanceSwaps|@PerformanceOnboarding"
 */

// ---------- Test type tags ----------
// Runner-agnostic tags that control which config/runner picks up a test.
// Used in test.describe() names and filtered via --grep / config grep.

/** Tag for performance tests (measured with TimerHelper, quality gates enforced). */
export const Performance = '@Performance';

/** Tag for system tests (functional verification, no quality gates or metrics). */
export const System = '@System';

// ---------- Area tags ----------

export const PerformanceAccountList = '@PerformanceAccountList';
export const PerformanceOnboarding = '@PerformanceOnboarding';
export const PerformanceLogin = '@PerformanceLogin';
export const PerformanceSwaps = '@PerformanceSwaps';
export const PerformanceLaunch = '@PerformanceLaunch';
export const PerformanceAssetLoading = '@PerformanceAssetLoading';
export const PerformancePredict = '@PerformancePredict';
export const PerformancePreps = '@PerformancePreps';

export const performanceTags = {
  performanceAccountList: {
    tag: '@PerformanceAccountList:',
    description:
      'Account list rendering and dismissal performance - covers account selector, multi-account scenarios, token load impact',
  },
  performanceOnboarding: {
    tag: '@PerformanceOnboarding:',
    description:
      'Onboarding flow performance - covers wallet creation, SRP import, initial setup screens, and first-time user experience',
  },
  performanceLogin: {
    tag: '@PerformanceLogin:',
    description:
      'Login and unlock performance - covers password entry, biometric unlock, session restoration, and time to wallet ready state',
  },
  performanceSwaps: {
    tag: '@PerformanceSwaps:',
    description:
      'Swap flow performance - covers quote fetching, token selection, swap execution, and transaction completion times',
  },
  performanceLaunch: {
    tag: '@PerformanceLaunch:',
    description:
      'App launch performance - covers cold start time, warm start time, splash screen duration, and time to interactive',
  },
  performanceAssetLoading: {
    tag: '@PerformanceAssetLoading:',
    description:
      'Asset and balance loading performance - covers token list rendering, balance fetching, NFT gallery loading, and portfolio value calculation',
  },
  performancePredict: {
    tag: '@PerformancePredict:',
    description:
      'Predict market performance - covers prediction market list loading, market details, deposit flows, and balance display',
  },
  performancePreps: {
    tag: '@PerformancePreps:',
    description:
      'Perpetuals trading performance - covers perps market loading, position management, add funds flow, and order execution',
  },
};
