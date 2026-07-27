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

/**
 * Shared third argument for `useABTest` on this experiment (exposure +
 * consistent variation labels).
 */
export const HOMEPAGE_PERPS_PILLS_EMPTY_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Homepage Perps empty state pills',
  variationNames: {
    control: 'Tile carousel empty state',
    treatment: 'Explore Perps Movers pills empty state',
  },
} as const;

/**
 * Builds `active_ab_tests` entries for perps transaction flows when the user is
 * on the homepage perps **empty** surface and the flag assignment is active.
 */
export function getHomepagePerpsPillsEmptyTransactionActiveAbTests(
  isAssignmentActive: boolean,
  variantName: string,
): TransactionActiveAbTestEntry[] | undefined {
  if (!isAssignmentActive) {
    return undefined;
  }
  return [
    createActiveABTestAssignment(
      HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
      variantName,
    ),
  ];
}

/** Must match `HomeSectionNames.PERPS` in `useHomeViewedEvent` (avoid importing here — circular deps). */
const HOMEPAGE_SECTION_NAME_PERPS = 'perps' as const;

/** `Home Viewed` — homepage perps slot with empty-surface experiment exposure. */
export const HOMEPAGE_PERPS_PILLS_EMPTY_AB_TEST_HOME_VIEWED_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
    validVariants: Object.values(HomepagePerpsPillsEmptyVariant),
    eventNames: [EVENT_NAME.HOME_VIEWED],
    injectWhenPropertiesMatch: {
      section_name: HOMEPAGE_SECTION_NAME_PERPS,
      is_empty: true,
    },
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

// ─── Homepage discovery pills (TMCU-926) ─────────────────────────────────────

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `home`, ticket TMCU-926).
 */
export const HOMEPAGE_DISCOVERY_PILLS_AB_KEY =
  'homeTMCU926AbtestDiscoveryPills';

export enum HomepageDiscoveryPillsVariant {
  Control = 'control',
  GrayIcons = 'grayIcons',
  ColorIcons = 'colorIcons',
}

export type HomepageDiscoveryPillIconStyle = 'gray' | 'color';

interface HomepageDiscoveryPillsVariantConfig {
  showPills: boolean;
  iconStyle: HomepageDiscoveryPillIconStyle | null;
}

export const HOMEPAGE_DISCOVERY_PILLS_VARIANTS: Record<
  HomepageDiscoveryPillsVariant,
  HomepageDiscoveryPillsVariantConfig
> = {
  [HomepageDiscoveryPillsVariant.Control]: {
    showPills: false,
    iconStyle: null,
  },
  [HomepageDiscoveryPillsVariant.GrayIcons]: {
    showPills: true,
    iconStyle: 'gray',
  },
  [HomepageDiscoveryPillsVariant.ColorIcons]: {
    showPills: true,
    iconStyle: 'color',
  },
};

export const HOMEPAGE_DISCOVERY_PILLS_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Homepage discovery pills',
  variationNames: {
    control: 'Current homepage without discovery pills',
    grayIcons: 'Discovery pills with gray icons',
    colorIcons: 'Discovery pills with color icons',
  },
} as const;

export const HOMEPAGE_DISCOVERY_PILLS_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: HOMEPAGE_DISCOVERY_PILLS_AB_KEY,
    validVariants: Object.values(HomepageDiscoveryPillsVariant),
    eventNames: [EVENT_NAME.HOME_VIEWED],
  };

/**
 * Builds `active_ab_tests` entries for swap / perps / predict transaction flows
 * when the homepage discovery-pills experiment assignment is active.
 */
export function getHomepageDiscoveryPillsTransactionActiveAbTests(
  isAssignmentActive: boolean,
  variantName: string,
): TransactionActiveAbTestEntry[] | undefined {
  if (!isAssignmentActive) {
    return undefined;
  }
  return [
    createActiveABTestAssignment(HOMEPAGE_DISCOVERY_PILLS_AB_KEY, variantName),
  ];
}

// ─── Homepage action buttons 2×4 grid (TMCU-1103) ────────────────────────────

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `home`, ticket TMCU-1103).
 */
export const HOMEPAGE_ACTION_BUTTONS_GRID_AB_KEY =
  'homeTMCU1103AbtestActionButtonsGrid';

export enum HomepageActionButtonsGridVariant {
  Control = 'control',
  Row1Top = 'row1Top',
  Row2Top = 'row2Top',
}

export type HomepageActionButtonsGridRowOrder = 'row1Top' | 'row2Top';

type HomepageActionButtonsGridVariantConfig =
  | { layout: 'fourSquare' }
  | {
      layout: 'eightCircular';
      rowOrder: HomepageActionButtonsGridRowOrder;
    };

export const HOMEPAGE_ACTION_BUTTONS_GRID_VARIANTS: Record<
  HomepageActionButtonsGridVariant,
  HomepageActionButtonsGridVariantConfig
> = {
  [HomepageActionButtonsGridVariant.Control]: {
    layout: 'fourSquare',
  },
  [HomepageActionButtonsGridVariant.Row1Top]: {
    layout: 'eightCircular',
    rowOrder: 'row1Top',
  },
  [HomepageActionButtonsGridVariant.Row2Top]: {
    layout: 'eightCircular',
    rowOrder: 'row2Top',
  },
};

export const HOMEPAGE_ACTION_BUTTONS_GRID_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Homepage action buttons 2x4 grid',
  variationNames: {
    control: '4 square action buttons',
    row1Top: '8 circular buttons, Row 1 top',
    row2Top: '8 circular buttons, Row 2 top',
  },
} as const;

export const HOMEPAGE_ACTION_BUTTONS_GRID_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: HOMEPAGE_ACTION_BUTTONS_GRID_AB_KEY,
    validVariants: Object.values(HomepageActionButtonsGridVariant),
    eventNames: [EVENT_NAME.HOME_VIEWED, EVENT_NAME.ACTION_BUTTON_CLICKED],
  };
