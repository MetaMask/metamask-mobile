import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';
import { createActiveABTestAssignment } from '../../../util/analytics/activeABTestAssignments';
import type { TransactionActiveAbTestEntry } from '../../../util/transactions/transaction-active-ab-test-attribution-registry';

// ─── Hub Page Discovery Tabs ────────────────────────────────────────────────

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `core`, ticket MCU-589).
 */
export const HUB_PAGE_DISCOVERY_TABS_AB_KEY =
  'coreMCU589AbtestHubPageDiscoveryTabs';

export enum HubPageDiscoveryTabsVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface HubPageDiscoveryTabsVariantConfig {
  discoveryTabsEnabled: boolean;
}

export const HUB_PAGE_DISCOVERY_TABS_VARIANTS: Record<
  HubPageDiscoveryTabsVariant,
  HubPageDiscoveryTabsVariantConfig
> = {
  [HubPageDiscoveryTabsVariant.Control]: { discoveryTabsEnabled: false },
  [HubPageDiscoveryTabsVariant.Treatment]: { discoveryTabsEnabled: true },
};

export const HUB_PAGE_DISCOVERY_TABS_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: HUB_PAGE_DISCOVERY_TABS_AB_KEY,
    validVariants: Object.values(HubPageDiscoveryTabsVariant),
    eventNames: [EVENT_NAME.HOME_VIEWED],
  };

// ─── Trending Sections ───────────────────────────────────────────────────────

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `home`, ticket TMCU-470).
 */
export const HOMEPAGE_TRENDING_SECTIONS_AB_KEY =
  'homeTMCU470AbtestTrendingSections';

/**
 * Builds `active_ab_tests` entries for swap / perps / predict Transaction Added
 * when the homepage trending-sections experiment assignment is active.
 */
export function getHomepageTrendingSectionsTransactionActiveAbTests(
  isAssignmentActive: boolean,
  variantName: string,
): TransactionActiveAbTestEntry[] | undefined {
  if (!isAssignmentActive) {
    return undefined;
  }
  return [
    createActiveABTestAssignment(
      HOMEPAGE_TRENDING_SECTIONS_AB_KEY,
      variantName,
    ),
  ];
}

export enum HomepageTrendingSectionsVariant {
  Control = 'control',
  TrendingSections = 'trendingSections',
}

export const HOMEPAGE_TRENDING_SECTIONS_VARIANTS: Record<
  HomepageTrendingSectionsVariant,
  { separateTrending: boolean }
> = {
  [HomepageTrendingSectionsVariant.Control]: { separateTrending: false },
  [HomepageTrendingSectionsVariant.TrendingSections]: {
    separateTrending: true,
  },
};

export const HOMEPAGE_TRENDING_SECTIONS_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: HOMEPAGE_TRENDING_SECTIONS_AB_KEY,
    validVariants: Object.values(HomepageTrendingSectionsVariant),
    eventNames: [EVENT_NAME.HOME_VIEWED],
  };

// ─── Wallet home post-onboarding steps (empty-balance checklist) ────────────

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `home`, ticket TMCU-610).
 */
export const WALLET_HOME_POST_ONBOARDING_AB_KEY =
  'homeTMCU610AbtestWalletHomePostOnboardingSteps';

export enum WalletHomePostOnboardingVariant {
  Control = 'control',
  PostOnboardingSteps = 'postOnboardingSteps',
}

export const WALLET_HOME_POST_ONBOARDING_VARIANTS: Record<
  WalletHomePostOnboardingVariant,
  { stepsEnabled: boolean }
> = {
  [WalletHomePostOnboardingVariant.Control]: { stepsEnabled: false },
  [WalletHomePostOnboardingVariant.PostOnboardingSteps]: {
    stepsEnabled: true,
  },
};

export const WALLET_HOME_POST_ONBOARDING_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: WALLET_HOME_POST_ONBOARDING_AB_KEY,
    validVariants: Object.values(WalletHomePostOnboardingVariant),
    eventNames: [EVENT_NAME.HOME_VIEWED],
  };

// ─── Homepage Perps empty state — Explore-style pills (TMCU-725) ─────────────

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `home`, ticket TMCU-725).
 */
export const HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY =
  'homeTMCU725AbtestHomepagePerpsPillsEmptyState';

export enum HomepagePerpsPillsEmptyVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface HomepagePerpsPillsEmptyVariantConfig {
  /** When true, users with no open positions/orders see Explore Perps Movers pills. */
  showExplorePillsWhenEmpty: boolean;
}

export const HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS: Record<
  HomepagePerpsPillsEmptyVariant,
  HomepagePerpsPillsEmptyVariantConfig
> = {
  [HomepagePerpsPillsEmptyVariant.Control]: {
    showExplorePillsWhenEmpty: false,
  },
  [HomepagePerpsPillsEmptyVariant.Treatment]: {
    showExplorePillsWhenEmpty: true,
  },
};

export const HOMEPAGE_PERPS_PILLS_EMPTY_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
    validVariants: Object.values(HomepagePerpsPillsEmptyVariant),
    eventNames: [EVENT_NAME.PERPS_UI_INTERACTION],
  };

// ─── Predict positions empty state (wallet Predict section layout) ──────────

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `core`, ticket MCU-747).
 */
export const PREDICT_POSITIONS_EMPTY_STATE_AB_KEY =
  'coreMCU747AbtestPredictPositionsEmptyState';

export enum PredictPositionsEmptyStateVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const PREDICT_POSITIONS_EMPTY_STATE_VARIANTS = {
  control: { layout: 'carousel' as const },
  treatment: { layout: 'list' as const },
};

export const PREDICT_EMPTY_STATE_CTA_NAMES = {
  EXPLORE_FEATURED: 'explore_featured',
  BROWSE_CATEGORY: 'browse_category',
} as const;

export type PredictEmptyStateCtaName =
  (typeof PREDICT_EMPTY_STATE_CTA_NAMES)[keyof typeof PREDICT_EMPTY_STATE_CTA_NAMES];

export function getPredictPositionsEmptyStateActiveAbTests(
  isAssignmentActive: boolean,
  variantName: string,
): TransactionActiveAbTestEntry[] | undefined {
  if (!isAssignmentActive) {
    return undefined;
  }
  return [
    createActiveABTestAssignment(
      PREDICT_POSITIONS_EMPTY_STATE_AB_KEY,
      variantName,
    ),
  ];
}

// Backward-compatible aliases for the existing hook/component names.
export const PREDICT_HOMEPAGE_DISCOVERY_AB_KEY =
  PREDICT_POSITIONS_EMPTY_STATE_AB_KEY;
export const PREDICT_HOMEPAGE_DISCOVERY_VARIANTS =
  PREDICT_POSITIONS_EMPTY_STATE_VARIANTS;
