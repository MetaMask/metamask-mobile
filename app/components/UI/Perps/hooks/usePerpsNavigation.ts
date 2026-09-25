import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { StackActions, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

import Routes from '../../../../constants/navigation/Routes';
import type { PerpsNavigationParamList } from '../types/navigation';
import {
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
  type Position,
  type Order,
} from '@metamask/perps-controller';
import { usePerpsTrading } from './usePerpsTrading';
import { selectPerpsProvider } from '../selectors/perpsController';
import usePerpsToasts from './usePerpsToasts';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import {
  registerTransactionAbTestAttributionForIds,
  withPendingTransactionActiveAbTests,
  type TransactionActiveAbTestEntry,
} from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import {
  claimPrewarmedDepositOrder,
  resolveDepositOrderProvider,
} from '../utils/prewarmedDepositOrder';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import { CONFIRMATION_HEADER_CONFIG } from '../constants/perpsConfig';
import { usePerpsProvider } from './usePerpsProvider';
import {
  failPerpsTradeSheetInteractiveTrace,
  startPerpsTradeSheetInteractiveTrace,
} from '../utils/perpsTradeSheetInteractiveTrace';
import {
  navigateToPerpsHomeTarget,
  resetToPerpsHomeTarget,
  useGetPerpsHomeNavigationTarget,
} from '../utils/perpsModeSwitch';

/**
 * Navigation handler result interface
 */
export interface PerpsNavigationHandlers {
  // Main app navigation
  navigateToWallet: () => void;
  navigateToBrowser: () => void;
  navigateToActions: () => void;
  navigateToActivity: () => void;
  navigateToRewards: () => void;

  // Perps-specific navigation
  navigateToMarketDetails: (
    market: PerpsMarketData,
    source?: string,
    transactionActiveAbTests?: TransactionActiveAbTestEntry[],
  ) => void;
  navigateToHome: (source?: string) => void;
  /**
   * Replace the Perps stack with Home. Use after Home was dropped so Back
   * from Home cannot return to the market that `navigateToHome` would leave
   * underneath.
   */
  resetToHome: (source?: string) => void;
  navigateToMarketList: (
    params?: PerpsNavigationParamList['PerpsMarketListView'],
  ) => void;
  navigateToMarketListFromHeader: (
    params?: PerpsNavigationParamList['PerpsMarketListView'],
  ) => void;
  navigateToOrder: (params: PerpsNavigationParamList['PerpsOrder']) => void;
  navigateToTutorial: (
    params?: PerpsNavigationParamList['PerpsTutorial'],
  ) => void;
  navigateToAdjustMargin: (
    position: Position,
    mode: 'add' | 'remove',
    options?: { enableHaptics?: boolean; useBottomSheet?: boolean },
  ) => void;
  navigateToClosePosition: (
    position: Position,
    source?: string,
    entry?: {
      buttonClicked?: string;
      buttonLocation?: string;
      enableHaptics?: boolean;
    },
  ) => void;
  navigateToOrderDetails: (order: Order) => void;

  // Utility navigation
  navigateBack: () => void;
  canGoBack: boolean;
}

/**
 * usePerpsNavigation Hook
 *
 * Centralized navigation handlers for Perps views
 * Provides consistent navigation patterns across all Perps components
 *
 * Features:
 * - Main app navigation (wallet, browser, activity, etc.)
 * - Perps-specific navigation (market details, home, list)
 * - Back navigation with canGoBack check
 * - Rewards/Settings toggle based on feature flag
 *
 * @example
 * ```tsx
 * const {
 *   navigateToMarketDetails,
 *   navigateBack,
 *   canGoBack
 * } = usePerpsNavigation();
 *
 * const handleMarketPress = (market: PerpsMarketData) => {
 *   navigateToMarketDetails(market, 'home_screen');
 * };
 * ```
 *
 * @returns Object containing all navigation handler functions
 */
export const usePerpsNavigation = (): PerpsNavigationHandlers => {
  const navigation = useNavigation<AppNavigationProp>();

  // Main app navigation handlers
  const navigateToWallet = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
  }, [navigation]);

  const navigateToBrowser = useCallback(() => {
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
    });
  }, [navigation]);

  const navigateToActions = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.WALLET_ACTIONS,
    });
  }, [navigation]);

  const navigateToActivity = useCallback(() => {
    navigation.navigate(Routes.PERPS.ACTIVITY, {
      redirectToPerpsTransactions: true,
      showBackButton: true,
    });
  }, [navigation]);

  const navigateToRewards = useCallback(() => {
    navigation.navigate(Routes.REWARDS_VIEW);
  }, [navigation]);

  // Perps-specific navigation handlers
  const navigateToMarketDetails = useCallback(
    (
      market: PerpsMarketData,
      source?: string,
      transactionActiveAbTests?: TransactionActiveAbTestEntry[],
    ) => {
      navigation.navigate(Routes.PERPS.MARKET_DETAILS, {
        market,
        source,
        ...(transactionActiveAbTests?.length
          ? { transactionActiveAbTests }
          : {}),
      });
    },
    [navigation],
  );

  // Keep this stream-free: usePerpsNavigation is also used by screens that can
  // mount outside PerpsStreamProvider (e.g. select-modify sheet in view tests).
  // Tradable-symbol validation belongs in stream-backed flows such as
  // usePerpsRecordMarketViewed.
  const getPerpsHomeNavigationTarget = useGetPerpsHomeNavigationTarget();

  const navigateToHome = useCallback(
    (source?: string) => {
      const target = getPerpsHomeNavigationTarget({ source });
      navigateToPerpsHomeTarget(navigation, target);
    },
    [navigation, getPerpsHomeNavigationTarget],
  );

  const resetToHome = useCallback(
    (source?: string) => {
      const target = getPerpsHomeNavigationTarget({ source });
      resetToPerpsHomeTarget(navigation, target);
    },
    [navigation, getPerpsHomeNavigationTarget],
  );

  const navigateToMarketList = useCallback(
    (params?: PerpsNavigationParamList['PerpsMarketListView']) => {
      // Inside the Perps stack, push rather than navigate. `navigate()` reuses
      // an existing market-list entry and pops everything above it, so opening
      // the list from a market screen the user reached *through* the list
      // animates backwards — the market → list → market loop reported in
      // TAT-3649.
      if (
        navigation.getState()?.routeNames?.includes(Routes.PERPS.MARKET_LIST)
      ) {
        navigation.dispatch(
          StackActions.push(Routes.PERPS.MARKET_LIST, params),
        );
        return;
      }

      // Outside the Perps stack (e.g. PerpsHomeView embedded as a tab in the
      // main navigator) the list is only reachable through the Perps root.
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params,
      });
    },
    [navigation],
  );

  const navigateToMarketListFromHeader = useCallback(
    (params?: PerpsNavigationParamList['PerpsMarketListView']) => {
      // Push a new MARKET_LIST over MARKET_DETAILS so the common
      // MARKET_LIST → MARKET_DETAILS stack keeps details beneath the slide-up
      // picker. navigate() would jump back to the existing list entry and pop
      // details, breaking Back-to-dismiss behavior.
      navigation.dispatch(
        StackActions.push(Routes.PERPS.MARKET_LIST, {
          ...params,
          animation: 'slide_from_bottom',
          // Selecting a market should replace the details beneath this picker
          // rather than pushing another MARKET_DETAILS on top of the stack.
          replaceOnSelect: true,
        }),
      );
    },
    [navigation],
  );

  const { depositWithOrder } = usePerpsTrading();
  const { switchProvider } = usePerpsProvider();
  const activeProvider = useSelector(selectPerpsProvider);
  const selectedAccountAddress = useSelector(selectPerpsSelectedAccountAddress);
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const { track } = usePerpsEventTracking();

  const navigateToOrder = useCallback(
    (params: PerpsNavigationParamList['PerpsOrder']) => {
      const useBottomSheet = Boolean(params.useBottomSheet);
      const orderProvider = params.providerId ?? activeProvider;
      const handleOrderError = (error: unknown) => {
        const err = ensureError(error, 'usePerpsNavigation.navigateToOrder');
        Logger.error(err, {
          tags: { feature: PERPS_CONSTANTS.FeatureName },
          context: { name: 'usePerpsNavigation.navigateToOrder', data: {} },
        });

        track(MetaMetricsEvents.PERPS_ERROR, {
          [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
            PERPS_EVENT_VALUE.ERROR_TYPE.BACKEND,
          [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: err.message,
          [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.TRADE_ACTION,
        });

        showToast(
          PerpsToastOptions.accountManagement.oneClickTrade.txCreationFailed,
        );
      };
      const switchToOrderProvider = async () => {
        if (params.providerId === undefined) {
          return;
        }
        const result = await switchProvider(params.providerId);
        if (!result.success) {
          throw new Error(
            result.error ??
              `Failed to switch perps provider to ${params.providerId}`,
          );
        }
      };
      // Lighter has no deposit-with-order route. Switch first so the form uses
      // Lighter's balance and market metadata, including from aggregated mode.
      if (orderProvider === 'lighter') {
        if (
          params.providerId === 'lighter' &&
          activeProvider !== undefined &&
          activeProvider !== params.providerId
        ) {
          switchToOrderProvider()
            .then(() => navigation.navigate(Routes.PERPS.BALANCE_ORDER, params))
            .catch(handleOrderError);
          return;
        }
        navigation.navigate(Routes.PERPS.BALANCE_ORDER, params);
        return;
      }
      const depositProvider = resolveDepositOrderProvider(activeProvider);
      let createOrder = depositWithOrder;
      if (
        params.providerId !== undefined &&
        params.providerId !== depositProvider
      ) {
        createOrder = async () => {
          await switchToOrderProvider();
          return depositWithOrder();
        };
      }
      if (useBottomSheet) {
        startPerpsTradeSheetInteractiveTrace(
          params.source ?? PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
        );
      }
      // The market screen may already have prepared this transaction. Claiming it
      // skips both creation and approval queueing; the criteria encode the
      // provider, so a market needing a switch never matches and falls through.
      const claimedPrewarm = selectedAccountAddress
        ? claimPrewarmedDepositOrder({
            accountAddress: selectedAccountAddress,
            providerId: params.providerId ?? depositProvider,
          })
        : undefined;
      const prepareOrder = async () => {
        if (claimedPrewarm) {
          try {
            const transactionId = await claimedPrewarm;
            registerTransactionAbTestAttributionForIds(
              [transactionId],
              params.transactionActiveAbTests,
            );
            return;
          } catch {
            // Prewarm failed or became unusable; create a fresh transaction.
          }
        }
        await withPendingTransactionActiveAbTests(
          params.transactionActiveAbTests,
          createOrder,
        );
      };
      prepareOrder()
        .then(() => {
          navigation.navigate(
            Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
            {
              ...params,
              ...(useBottomSheet ? { useBottomSheet: true } : {}),
              showPerpsHeader: useBottomSheet
                ? false
                : CONFIRMATION_HEADER_CONFIG.ShowPerpsHeaderForDepositAndTrade,
            },
          );
        })
        .catch((error: unknown) => {
          if (useBottomSheet) {
            failPerpsTradeSheetInteractiveTrace('transaction_creation_failed');
          }
          handleOrderError(error);
        });
    },
    [
      navigation,
      depositWithOrder,
      switchProvider,
      activeProvider,
      selectedAccountAddress,
      showToast,
      PerpsToastOptions.accountManagement.oneClickTrade.txCreationFailed,
      track,
    ],
  );

  const navigateToTutorial = useCallback(
    (params?: PerpsNavigationParamList['PerpsTutorial']) => {
      navigation.navigate(Routes.PERPS.TUTORIAL, params);
    },
    [navigation],
  );

  const navigateToAdjustMargin = useCallback(
    (
      position: Position,
      mode: 'add' | 'remove',
      options?: { enableHaptics?: boolean; useBottomSheet?: boolean },
    ) => {
      navigation.navigate(Routes.PERPS.ADJUST_MARGIN, {
        position,
        mode,
        enableHaptics: options?.enableHaptics,
        ...(options?.useBottomSheet ? { useBottomSheet: true } : {}),
      });
    },
    [navigation],
  );

  const navigateToClosePosition = useCallback(
    (
      position: Position,
      source?: string,
      entry?: {
        buttonClicked?: string;
        buttonLocation?: string;
        enableHaptics?: boolean;
      },
    ) => {
      navigation.navigate(Routes.PERPS.CLOSE_POSITION, {
        position,
        source,
        buttonClicked: entry?.buttonClicked,
        buttonLocation: entry?.buttonLocation,
        enableHaptics: entry?.enableHaptics,
      });
    },
    [navigation],
  );

  const navigateToOrderDetails = useCallback(
    (order: Order) => {
      navigation.navigate(Routes.PERPS.ORDER_DETAILS, { order });
    },
    [navigation],
  );

  // Utility navigation handlers
  const navigateBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const canGoBack = navigation.canGoBack();

  return {
    // Main app navigation
    navigateToWallet,
    navigateToBrowser,
    navigateToActions,
    navigateToActivity,
    navigateToRewards,

    // Perps-specific navigation
    navigateToMarketDetails,
    navigateToHome,
    resetToHome,
    navigateToMarketList,
    navigateToMarketListFromHeader,
    navigateToOrder,
    navigateToTutorial,
    navigateToAdjustMargin,
    navigateToClosePosition,
    navigateToOrderDetails,

    // Utility navigation
    navigateBack,
    canGoBack,
  };
};
