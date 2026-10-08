import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import {
  type Position,
  type Order,
  type OrderType,
  type PerpsMarketData,
  type TPSLTrackingData,
  type SortDirection,
  type SortOptionId,
  type MarketTypeFilter,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import type {
  PriceAlertRouteParams,
  CreatePriceAlertRouteParams,
} from '../../Assets/PriceAlerts/constants';
import { PerpsTransaction } from './transactionHistory';
import type { DataMonitorParams } from '../hooks/usePerpsDataMonitor';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import type { PerpsTooltipViewRouteParams } from '../Views/PerpsTooltipView/PerpsTooltipView';

// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PerpsModalsNavigationParamList = {
  /**
   * Trade sheet entry from outside the Perps stack (e.g. Social copy trade).
   * The modal stack is transparent, so the sheet opens over the calling page.
   */
  PerpsOrderRedirect: PerpsStackParamList['PerpsOrderRedirect'];
  RedesignedConfirmations: PerpsStackParamList['RedesignedConfirmations'];
  PerpsQuoteExpiredModal: undefined;
  PerpsGTMModal: undefined;
  PerpsCloseAllPositions: undefined;
  PerpsCancelAllOrders: undefined;
  PerpsCrossMarginWarning: undefined;
  PerpsSelectProvider: undefined;
  PerpsModeSelection: undefined;
  PerpsOutreachDetails: undefined;
  PerpsSelectModifyAction: {
    position: Position;
    useBottomSheet?: boolean;
  };
  PerpsSelectAdjustMarginAction: {
    position: Position;
  };
  PerpsSelectOrderType: {
    currentOrderType: OrderType;
    asset: string;
    direction: 'long' | 'short';
  };
};

// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PerpsClosePositionModalsNavigationParamList = {
  PerpsTooltip: PerpsTooltipViewRouteParams;
};

/**
 * Shared order / redesigned-confirmation params for the Perps trade flow.
 *
 * Declared as an object-literal `type` (not `interface`) so it keeps an implicit
 * index signature and stays assignable to `Record<string, unknown>` (e.g. when
 * passed as tutorial `redirectParams`). The eslint-disable mirrors
 * `PerpsStackParamList` below, whose auto-fix would otherwise convert this to an
 * `interface` and drop the implicit index signature.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PerpsOrderRouteParams = {
  direction: 'long' | 'short';
  asset: string;
  providerId?: PerpsProviderType;
  defaultSzDecimals?: number;
  defaultMaxLeverage?: number;
  leverage?: number;
  amount?: string;
  price?: string;
  orderType?: OrderType;
  existingPosition?: Position; // Pass existing position for leverage consistency when adding to position
  hideTPSL?: boolean; // Hide TP/SL row when modifying existing position
  fromTokenDetails?: boolean;
  /** When false, confirmation screen uses header: () => null; when true/undefined uses headerLeft/title options */
  showPerpsHeader?: boolean;
  /** Analytics: how the user got to the order screen (e.g. trade_action, order_book_long_button, asset_detail_screen) */
  source?: string;
  /** Analytics: market-list discovery section (search, watchlist, category, all_markets) */
  source_section?: string;
  /** Analytics: chart library active when the order flow started */
  chartLibrary?: string;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  /** Resolved shared TAT-3938 assignment, forwarded to confirmation routing. */
  useBottomSheet?: boolean;
  /**
   * Read by the shared `Confirm` screen: while the Trade sheet variant has no
   * approval (before it attaches, and after Place order removes it), show the
   * loader inside a bottom sheet instead of a full-screen spinner.
   */
  forceBottomSheet?: boolean;
  /**
   * After submit, dismiss back to the presenting screen instead of opening
   * market details. The order still places and the same submitted / confirmed
   * / failed toasts still fire.
   */
  stayOnCurrentScreen?: boolean;
};

// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PerpsStackParamList = {
  // Order flow routes
  PerpsOrder: PerpsOrderRouteParams;
  PerpsBalanceOrder: PerpsOrderRouteParams;

  PerpsOrderSuccess: {
    orderId: string;
    direction: 'long' | 'short';
    asset: string;
    size: string;
    price?: string;
    leverage?: number;
  };

  // Deposit flow routes
  PerpsDeposit: undefined;

  PerpsDepositPreview: {
    amount: string;
    fromToken: string;
    toToken?: string;
    exchangeRate?: string;
    fees?: string;
    estimatedGas?: string;
  };

  PerpsDepositProcessing: {
    amount: string;
    fromToken: string;
    toToken?: string;
    transactionHash?: string;
  };

  PerpsDepositSuccess: {
    amount: string;
    fromToken: string;
    toToken?: string;
    transactionHash: string;
    finalBalance?: string;
  };

  // Withdrawal flow routes
  PerpsWithdraw: undefined;

  // Market and position management routes
  PerpsMarketList: undefined;

  PerpsMarketListView:
    | {
        source?: string;
        variant?: 'full' | 'minimal';
        title?: string;
        showBalanceActions?: boolean;
        showBottomNav?: boolean;
        showWatchlistOnly?: boolean;
        defaultMarketTypeFilter?: MarketTypeFilter;
        defaultSortOptionId?: SortOptionId;
        defaultSortDirection?: SortDirection;
        fromHome?: boolean;
        button_clicked?: string;
        button_location?: string;
        transactionActiveAbTests?: TransactionActiveAbTestEntry[];
        animation?: NativeStackNavigationOptions['animation'];
        animationDuration?: NativeStackNavigationOptions['animationDuration'];
        /**
         * When true, selecting a market replaces the underlying MARKET_DETAILS
         * (and dismisses this list) instead of pushing another details screen.
         * Used by the header slide-up picker.
         */
        replaceOnSelect?: boolean;
        /**
         * When true, fires selection haptics on market row taps.
         * Defaults off so Lite entry points stay silent.
         */
        enableHaptics?: boolean;
        /**
         * Stamped when Perps Home was removed from this stack (TAT-3786).
         * Extra params otherwise compile, which is how earlier resets dropped it.
         */
        homeDroppedFromHistory?: true;
      }
    | undefined;

  PerpsMarketDetails: {
    /** Full market when available; Partial is accepted for trade-details deep entries. */
    market: PerpsMarketData | Partial<PerpsMarketData>;
    /**
     * Preselects a side in Pro mode's inline order form. Set by entry points
     * that already express a trade intent, e.g. the spot token details
     * Long/Short buttons. Ignored by the Lite market screen.
     */
    direction?: 'long' | 'short';
    initialTab?: 'position' | 'orders' | 'info';
    monitoringIntent?: Partial<DataMonitorParams>;
    source?: string;
    source_section?: string;
    /** Telemetry-only reason when the header picker replaces the active market. */
    detailGenerationTrigger?: 'market_switch';
    button_clicked?: string;
    button_location?: string;
    transactionActiveAbTests?: TransactionActiveAbTestEntry[];
    /**
     * Stamped when Perps Home was removed from this stack (TAT-3786).
     * Extra params otherwise compile, which is how earlier resets dropped it.
     */
    homeDroppedFromHistory?: true;
  };

  PerpsPositions: undefined;

  PerpsPositionDetails: {
    position: Position;
    action?: 'view' | 'edit' | 'close';
  };

  PerpsClosePosition: {
    position: Position;
    source?: string;
    buttonClicked?: string;
    buttonLocation?: string;
    enableHaptics?: boolean;
  };

  PerpsAdjustMargin: {
    position: Position;
    mode: 'add' | 'remove';
    enableHaptics?: boolean;
    /** Resolved shared TAT-3938 assignment for the amount-entry experience. */
    useBottomSheet?: boolean;
  };

  // Action selection routes
  PerpsSelectModifyAction: {
    position: Position;
    useBottomSheet?: boolean;
  };

  PerpsSelectAdjustMarginAction: {
    position: Position;
  };

  PerpsSelectOrderType: {
    currentOrderType: OrderType;
    asset: string;
    direction: 'long' | 'short';
  };

  // Order history routes
  PerpsOrderHistory: undefined;

  PerpsOrderDetails: {
    order: Order;
    action?: 'view' | 'edit' | 'cancel';
  };

  // Main trading view
  PerpsTradingView: undefined;

  PerpsPositionTransaction: {
    transaction: PerpsTransaction;
  };

  PerpsOrderTransaction: {
    transaction: PerpsTransaction;
  };

  PerpsFundingTransaction: {
    transaction: PerpsTransaction;
  };

  PerpsTutorial:
    | {
        isFromDeeplink?: boolean;
        isFromGTMModal?: boolean;
        /** Analytics: how the user got to the tutorial (e.g. homescreen_tab, main_action_button) */
        source?: string;
        /** Screen to navigate to after tutorial completion instead of the default PerpsHome */
        redirectScreen?: string;
        /** Params to pass to the redirect screen */
        redirectParams?: Record<string, unknown>;
      }
    | undefined;

  // TP/SL screen
  PerpsTPSL: {
    asset: string;
    currentPrice?: number;
    direction?: 'long' | 'short';
    position?: Position;
    initialTakeProfitPrice?: string;
    initialStopLossPrice?: string;
    leverage?: number;
    orderType?: OrderType;
    limitPrice?: string;
    amount?: string; // For new orders - USD amount to calculate position size for P&L
    szDecimals?: number; // For new orders - asset decimal precision for P&L
    /**
     * When true, fires catalog haptics for meaningful TP/SL gestures.
     * Defaults off so Lite entry points stay silent.
     */
    enableHaptics?: boolean;
    /**
     * Screen-vs-bottom-sheet treatment, resolved by the caller. Only the
     * position-edit entry points pass it; the order flow keeps the full screen
     * either way and must not read the experiment.
     *
     * The navigator needs the arm before the screen mounts, so it cannot be
     * resolved inside the view: screen `options` is a plain function and the
     * sheet must skip the stack animation that would otherwise slide its
     * backdrop in.
     */
    useBottomSheet?: boolean;
    /**
     * Claims the recovery owner's current reviewed action before dismissal.
     * When supplied, must return true to submit. The owner must still fence
     * forwarding in onConfirm after the editor has dismissed.
     */
    onBeforeConfirm?: () => boolean;
    /**
     * Validates the recovery owner's exact authoritative position review when
     * ordinary position streams are unavailable. Without this callback, the
     * view uses its existing live-position guard. The owner must also fence
     * forwarding after dismissal; the provider rechecks size and entry price.
     */
    isPositionReviewCurrent?: (position: Position) => boolean;
    /**
     * Called when user confirms TP/SL. First arg is position when editing existing position (avoids "No position found" from stale ref).
     * Signature: (position?, takeProfitPrice?, stopLossPrice?, trackingData?) so both edit-flow and order-flow can use it.
     */
    onConfirm: (
      position?: Position,
      takeProfitPrice?: string,
      stopLossPrice?: string,
      trackingData?: TPSLTrackingData,
    ) => Promise<{ success: boolean } | void>;
  };

  // PnL Hero Card screen
  PerpsPnlHeroCard: {
    position: Position;
    marketPrice?: string;
    source?: string;
  };

  // Order Book view - Full depth order book display
  PerpsOrderBook: {
    symbol: string;
    marketData?: PerpsMarketData;
  };

  // Activity view - Stack-based for proper back navigation
  // Uses the same redirect params as the tab-based TRANSACTIONS_VIEW
  PerpsActivity: {
    /**
     * Redirect to Perps transactions tab
     */
    redirectToPerpsTransactions?: boolean;
    /**
     * Redirect to Orders tab
     */
    redirectToOrders?: boolean;
    /**
     * Show back button in header for stack navigation
     */
    showBackButton?: boolean;
  };

  /**
   * Params for RedesignedConfirmations when opened from Perps order flow.
   * Partial so header-option helpers can take only `showPerpsHeader`.
   */
  RedesignedConfirmations: Partial<PerpsOrderRouteParams> | undefined;

  /** Params for PerpsOrderRedirect - handles one-click trade from token details */
  PerpsOrderRedirect: {
    direction: 'long' | 'short';
    asset: string;
    leverage?: number;
    /** When true, the order was initiated from the token details screen */
    fromTokenDetails?: boolean;
    /**
     * Analytics source for the order. Token details omit this and the redirect
     * defaults to the asset-detail screen. The Social feed passes `trader_feed`.
     */
    source?: string;
    transactionActiveAbTests?: TransactionActiveAbTestEntry[];
    /**
     * Forces the trade bottom sheet and renders the redirect transparent.
     * Meant for the `PerpsModals` entry, where the page beneath should stay
     * visible. Omitted entries keep the screen-vs-sheet experiment assignment.
     */
    useBottomSheet?: boolean;
    /**
     * After submit, stay on the presenting screen (e.g. Social feed) instead
     * of opening market details.
     */
    stayOnCurrentScreen?: boolean;
  };

  // Screen names registered in the Perps stack (may differ from legacy aliases above)
  PerpsTrendingView:
    | {
        source?: string;
        variant?: 'full' | 'minimal';
        title?: string;
        showBalanceActions?: boolean;
        showBottomNav?: boolean;
        showWatchlistOnly?: boolean;
        defaultMarketTypeFilter?: MarketTypeFilter;
        defaultSortOptionId?: SortOptionId;
        defaultSortDirection?: SortDirection;
        fromHome?: boolean;
        button_clicked?: string;
        button_location?: string;
        transactionActiveAbTests?: TransactionActiveAbTestEntry[];
        animation?: NativeStackNavigationOptions['animation'];
        animationDuration?: NativeStackNavigationOptions['animationDuration'];
        /**
         * Stamped when Perps Home was removed from this stack (TAT-3786).
         * `MARKET_LIST` is `PerpsTrendingView`; drop-Home remaining routes include it.
         */
        homeDroppedFromHistory?: true;
      }
    | undefined;
  PerpsOrderDetailsView: {
    order: Order;
    action?: 'view' | 'edit' | 'cancel';
  };
  PerpsHIP3Debug: undefined;
  PerpsClosePositionModals:
    | NavigatorScreenParams<PerpsClosePositionModalsNavigationParamList>
    | undefined;
  PerpsModals:
    | NavigatorScreenParams<PerpsModalsNavigationParamList>
    | undefined;
  PerpsQuoteExpiredModal: undefined;
  PerpsGTMModal: undefined;
  PerpsCloseAllPositions: undefined;
  PerpsCancelAllOrders: undefined;
  PerpsTooltip: undefined;
  PerpsCrossMarginWarning: undefined;
  PerpsSelectProvider: undefined;
  ConfirmationPayWithModal: undefined;
  ConfirmationPayWithBottomSheet: undefined;

  // Price alert routes (perps variants of the shared alert UI)
  PerpsPriceAlerts: PriceAlertRouteParams;
  PerpsCreatePriceAlert: CreatePriceAlertRouteParams;
};

/** Screens inside the Perps stack plus the root `Perps` entry for cross-stack navigation. */
// Intersection (`&`) requires `type`; `interface` cannot express this.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PerpsNavigationParamList = PerpsStackParamList & {
  Perps: NavigatorScreenParams<PerpsStackParamList> | undefined;
};

/**
 * Type helper for PERPS route parameters
 */
export type PerpsRouteParams<T extends keyof PerpsNavigationParamList> =
  PerpsNavigationParamList[T];
