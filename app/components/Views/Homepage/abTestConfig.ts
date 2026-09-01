import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';
import { createActiveABTestAssignment } from '../../../util/analytics/activeABTestAssignments';
import type { TransactionActiveAbTestEntry } from '../../../util/transactions/transaction-active-ab-test-attribution-registry';

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

// ─── Homepage balance breakdown ──────────────────────────────────────────────

export const HOMEPAGE_BALANCE_BREAKDOWN_AB_KEY =
  'homeTMCU1209AbtestHomepageBalanceBreakdown';
export const HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT =
  'homescreen_balance_breakdown';

export enum HomepageBalanceBreakdownVariant {
  Control = 'control',
  Icons = 'icons',
  IconsWithArrows = 'iconsWithArrows',
  Allocation = 'allocation',
}

export type HomepageBalanceBreakdownLayout = 'icons' | 'allocation';

interface HomepageBalanceBreakdownVariantConfig {
  layout: HomepageBalanceBreakdownLayout | null;
  showRowArrows: boolean;
}

export const HOMEPAGE_BALANCE_BREAKDOWN_VARIANTS: Record<
  HomepageBalanceBreakdownVariant,
  HomepageBalanceBreakdownVariantConfig
> = {
  [HomepageBalanceBreakdownVariant.Control]: {
    layout: null,
    showRowArrows: false,
  },
  [HomepageBalanceBreakdownVariant.Icons]: {
    layout: 'icons',
    showRowArrows: false,
  },
  [HomepageBalanceBreakdownVariant.IconsWithArrows]: {
    layout: 'icons',
    showRowArrows: true,
  },
  [HomepageBalanceBreakdownVariant.Allocation]: {
    layout: 'allocation',
    showRowArrows: false,
  },
};

export const HOMEPAGE_BALANCE_BREAKDOWN_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Homepage balance breakdown',
  variationNames: {
    control: 'Current homepage without balance breakdown',
    icons: 'Primitive breakdown with icons',
    iconsWithArrows: 'Primitive breakdown with icons and row arrows',
    allocation: 'Primitive allocation breakdown',
  },
} as const;

export function getHomepageBalanceBreakdownTransactionActiveAbTests(
  isAssignmentActive: boolean,
  variantName: string,
): TransactionActiveAbTestEntry[] | undefined {
  if (!isAssignmentActive) {
    return undefined;
  }

  return [
    createActiveABTestAssignment(
      HOMEPAGE_BALANCE_BREAKDOWN_AB_KEY,
      variantName,
    ),
  ];
}

export const HOMEPAGE_BALANCE_BREAKDOWN_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: HOMEPAGE_BALANCE_BREAKDOWN_AB_KEY,
    validVariants: Object.values(HomepageBalanceBreakdownVariant),
    eventNames: [
      EVENT_NAME.HOME_VIEWED,
      EVENT_NAME.MONEY_SURFACE_VIEWED,
      EVENT_NAME.PERPS_SCREEN_VIEWED,
      EVENT_NAME.PREDICT_FEED_VIEWED,
      EVENT_NAME.PREDICT_HOME_VIEWED,
      EVENT_NAME.POSITION_SCREEN_VIEWED,
    ],
    eventPropertyRequirements: {
      [EVENT_NAME.MONEY_SURFACE_VIEWED]: {
        entry_point: HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT,
      },
      [EVENT_NAME.PERPS_SCREEN_VIEWED]: {
        source: HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT,
      },
      [EVENT_NAME.PREDICT_FEED_VIEWED]: {
        entry_point: HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT,
      },
      [EVENT_NAME.PREDICT_HOME_VIEWED]: {
        entry_point: HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT,
      },
      [EVENT_NAME.POSITION_SCREEN_VIEWED]: {
        source: HOMEPAGE_BALANCE_BREAKDOWN_ENTRY_POINT,
      },
    },
  };

// ─── Wallet header & bottom NavBar refresh (TMCU-1276) ───────────────────────

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `home`, ticket TMCU-1276).
 */
export const HEADER_NAV_BAR_AB_KEY = 'homeTMCU1276AbtestHeaderNavBar';

export enum HeaderNavBarVariant {
  Control = 'control',
  SearchFocused = 'searchFocused',
  TradeFocused = 'tradeFocused',
}

/** Trailing circular button alongside the floating NavBar pill. */
export type HeaderNavBarTrailingAction = 'none' | 'search' | 'trade';

interface HeaderNavBarVariantConfig {
  isCompactHeaderEnabled: boolean;
  trailingNavBarAction: HeaderNavBarTrailingAction;
  /** Search moves into the header when the NavBar button opens the trade tray. */
  isHeaderSearchEnabled: boolean;
}

const HEADER_NAV_BAR_CONTROL_CONFIG: HeaderNavBarVariantConfig = {
  isCompactHeaderEnabled: false,
  trailingNavBarAction: 'none',
  isHeaderSearchEnabled: false,
};

const HEADER_NAV_BAR_SEARCH_FOCUSED_CONFIG: HeaderNavBarVariantConfig = {
  isCompactHeaderEnabled: true,
  trailingNavBarAction: 'search',
  isHeaderSearchEnabled: false,
};

const HEADER_NAV_BAR_TRADE_FOCUSED_CONFIG: HeaderNavBarVariantConfig = {
  isCompactHeaderEnabled: true,
  trailingNavBarAction: 'trade',
  isHeaderSearchEnabled: true,
};

/**
 * Non-App-Store environments that opt into the override below — every track the
 * TestFlight workflow can build (`build-and-upload-to-testflight.yml`). Only the
 * App Store `production` build is excluded.
 */
const HEADER_NAV_BAR_OVERRIDE_ENVIRONMENTS = ['dev', 'exp', 'beta', 'rc'];

/**
 * TEMPORARY — forces one treatment arm for internal team testing (TMCU-1276).
 * Remove this override and give control its own config back once testing wraps up.
 *
 * LaunchDarkly still serves only `control`, so instead of re-cutting the flag we
 * point control at a treatment config in dev and TestFlight builds. `production`
 * is deliberately absent and the check is an allow-list, so an App Store build —
 * or any environment we failed to anticipate — gets the real control experience.
 *
 * Note: the assignment stays unresolved, so `isActive` is `false` — no
 * `Experiment Viewed` and no `active_ab_tests` enrichment. These builds show the
 * UI but produce no experiment data.
 */
const IS_HEADER_NAV_BAR_OVERRIDE_ENABLED =
  __DEV__ ||
  HEADER_NAV_BAR_OVERRIDE_ENVIRONMENTS.includes(
    process.env.METAMASK_ENVIRONMENT ?? '',
  );

/** The arm the override serves. Swap this one line to test a different arm. */
const FORCED_HEADER_NAV_BAR_CONFIG = HEADER_NAV_BAR_SEARCH_FOCUSED_CONFIG;

export const HEADER_NAV_BAR_VARIANTS: Record<
  HeaderNavBarVariant,
  HeaderNavBarVariantConfig
> = {
  [HeaderNavBarVariant.Control]: IS_HEADER_NAV_BAR_OVERRIDE_ENABLED
    ? FORCED_HEADER_NAV_BAR_CONFIG
    : HEADER_NAV_BAR_CONTROL_CONFIG,
  [HeaderNavBarVariant.SearchFocused]: HEADER_NAV_BAR_SEARCH_FOCUSED_CONFIG,
  [HeaderNavBarVariant.TradeFocused]: HEADER_NAV_BAR_TRADE_FOCUSED_CONFIG,
};

export const HEADER_NAV_BAR_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Header and Nav Bar refresh',
  variationNames: {
    control: 'Current header and NavBar',
    searchFocused:
      'Refreshed header with consolidated hamburger menu and NavBar search',
    tradeFocused: 'Refreshed header with NavBar trade button and header search',
  },
} as const;

export const HEADER_NAV_BAR_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: HEADER_NAV_BAR_AB_KEY,
    validVariants: Object.values(HeaderNavBarVariant),
    eventNames: [EVENT_NAME.HOME_VIEWED],
  };
