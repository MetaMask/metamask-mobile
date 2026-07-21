/**
 * Predict navigation parameters
 */

import type { NavigatorScreenParams } from '@react-navigation/native';
import {
  PredictActivityItem,
  PredictCategory,
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
  PredictPosition,
  PredictSeries,
} from '.';
import { PredictEventValues } from '../constants/eventNames';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import type { PredictFeedId } from '../constants/feedConfig';

export type PredictEntryPoint =
  | typeof PredictEventValues.ENTRY_POINT.CAROUSEL
  | typeof PredictEventValues.ENTRY_POINT.PREDICT_FEED
  | typeof PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS
  | typeof PredictEventValues.ENTRY_POINT.SEARCH
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_NEW_PREDICTION
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED_CAROUSEL
  | typeof PredictEventValues.ENTRY_POINT.HOMEPAGE_FEATURED_LIST
  | typeof PredictEventValues.ENTRY_POINT.MAIN_TRADE_BUTTON
  | typeof PredictEventValues.ENTRY_POINT.HOMESCREEN_PILL
  | typeof PredictEventValues.ENTRY_POINT.REWARDS
  | typeof PredictEventValues.ENTRY_POINT.GTM_MODAL
  | typeof PredictEventValues.ENTRY_POINT.BACKGROUND
  | typeof PredictEventValues.ENTRY_POINT.TRENDING_SEARCH
  | typeof PredictEventValues.ENTRY_POINT.TRENDING
  | typeof PredictEventValues.ENTRY_POINT.BUY_PREVIEW
  | typeof PredictEventValues.ENTRY_POINT.HOME_SECTION
  | typeof PredictEventValues.ENTRY_POINT.EXPLORE;

/** Predict market list route parameters */
export interface PredictMarketListRouteParams {
  entryPoint?: PredictEntryPoint;
  feedId?: PredictFeedId;
  /**
   * Legacy top-level Predict feed tab key (hot / base tabs).
   * Consumed by `usePredictTabs`. Not interchangeable with `tabId`.
   */
  tab?: PredictCategory;
  /**
   * Sub-tab id within a feed defined in the feed registry
   * (e.g. `basketball`, `tennis`, `all`, `live`). Paired with `feedId`
   * for deep-linking to a specific tab inside a feed. Kept as a plain
   * string so the route stays decoupled from the registry shape.
   */
  tabId?: string;
  query?: string;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

/**
 * Generic Predict feed route parameters.
 *
 * Consumed by the config-driven `PredictFeedView` (powers Sports / Politics /
 * Crypto / Live / Trending). Carries stable IDs only — the
 * view resolves them into a render-ready config via `usePredictFeedConfig`.
 * The route registration + deeplink parsing that populates these params lands
 * separately (route + deeplinks ticket); the view reads them via `useRoute`.
 */
export interface PredictFeedRouteParams {
  feedId: PredictFeedId;
  /** Initial sub-tab id within the feed (e.g. `basketball`, `all`). */
  initialTabId?: string;
  /** Initial filter chip id within the active tab (e.g. `all`, `live`). */
  initialFilterId?: string;
  /** Opens the search overlay pre-filled with this query. */
  query?: string;
  entryPoint?: PredictEntryPoint;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

/** Predict market details parameters */
export interface PredictMarketDetailsParams {
  marketId?: string;
  series?: PredictSeries;
  seriesId?: string;
  seriesRecurrence?: string;
  entryPoint?: PredictEntryPoint;
  /** Active feed tab key at the time the market card was tapped (e.g. "trending"). */
  predictFeedTab?: string;
  /** Screen context the trade originated from. */
  predictScreen?: string;
  title?: string;
  image?: string;
  isGame?: boolean;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

/** Predict activity detail parameters */
export interface PredictActivityDetailParams {
  activity: PredictActivityItem;
}

export type PredictPositionsTabKey = 'positions' | 'history';

/** Predict Positions screen parameters */
export interface PredictPositionsParams {
  entryPoint?: PredictEntryPoint;
  initialTab?: PredictPositionsTabKey;
}

/** Predict add funds modal parameters */
export interface PredictAddFundsModalParams {
  /** When true, deposit() is called immediately on mount — skipping the explanation UI. */
  autoDeposit?: boolean;
}

/** Predict buy preview parameters */
export interface PredictBuyPreviewParams {
  market: PredictMarket;
  outcome: PredictOutcome;
  outcomeToken: PredictOutcomeToken;
  entryPoint?: PredictEntryPoint;
  /** Active feed tab key at the time the market card was tapped (e.g. "trending"). */
  predictFeedTab?: string;
  /** Screen context the trade originated from. */
  predictScreen?: string;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  /**
   * When true, the beforeRemove listener in PredictBuyPreview will fire
   * trackBetslipDismissed for swipe/hardware-back dismissals. Only set by
   * PredictPreviewSheetProvider when disableBottomSheet is active — keeps the
   * analytics change scoped to the new HomepageDiscoveryTabs flow and avoids
   * changing event volume for the pre-existing flagless screen-mode path.
   */
  trackSwipeDismiss?: boolean;
}

/** Predict sell preview parameters */
export interface PredictSellPreviewParams {
  market: PredictMarket;
  position: PredictPosition;
  outcome: PredictOutcome;
  entryPoint?: PredictEntryPoint;
}

/** Props for rendering PredictBuyPreview inside a BottomSheet */
export interface PredictBuyPreviewContentProps extends PredictBuyPreviewParams {
  onClose: () => void;
}

/** Props for rendering PredictSellPreview inside a BottomSheet */
export interface PredictSellPreviewContentProps
  extends PredictSellPreviewParams {
  onClose: () => void;
}

/** Discriminated union props for PredictBuyPreview / PredictBuyWithAnyToken */
export type PredictBuyPreviewProps =
  | ({ mode: 'sheet' } & PredictBuyPreviewContentProps)
  | { mode?: never };

/** Discriminated union props for PredictSellPreview */
export type PredictSellPreviewProps =
  | ({ mode: 'sheet' } & PredictSellPreviewContentProps)
  | { mode?: never };

// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictModalsNavigationParamList = {
  PredictUnavailable: undefined;
  PredictGTMModal: undefined;
  PredictAddFundsSheet: PredictAddFundsModalParams | undefined;
  PredictActivityDetail: PredictActivityDetailParams;
  RedesignedConfirmations: undefined;
  NoHeaderConfirmations: undefined;
};

// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictStackParamList = {
  PredictMarketList: PredictMarketListRouteParams | undefined;
  PredictFeed: PredictFeedRouteParams | undefined;
  PredictMarketDetails: PredictMarketDetailsParams | undefined;
  PredictPositions: PredictPositionsParams | undefined;
  PredictSellPreview: PredictSellPreviewParams;
  PredictBuyPreview: PredictBuyPreviewParams;
  RedesignedConfirmations: undefined;
  NoHeaderConfirmations: undefined;
  ConfirmationPayWithModal: undefined;
  ConfirmationPayWithBottomSheet: undefined;
};

// Intersection (`&`) requires `type`; `interface` cannot express this.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictNavigationParamList = PredictStackParamList &
  PredictModalsNavigationParamList & {
    Predict: NavigatorScreenParams<PredictStackParamList> | undefined;
    PredictModals:
      | NavigatorScreenParams<PredictModalsNavigationParamList>
      | undefined;
  };
