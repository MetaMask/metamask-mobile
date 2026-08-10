import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  usePerpsMarketForAsset,
  type UsePerpsMarketForAssetResult,
} from '../../Perps/hooks/usePerpsMarketForAsset';
import Routes from '../../../../constants/navigation/Routes';
import { useIsPerpsProModeActive } from '../../Perps/utils/perpsModeSwitch';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import {
  PERPS_EVENT_VALUE,
  type OrderDirection,
} from '@metamask/perps-controller';

export interface UsePerpsActionsParams {
  /** Token symbol, or null to skip the perps market check */
  symbol: string | null;
  /** When true, signals that navigation originated from the token details screen */
  fromTokenDetails?: boolean;
  /** Homepage / explicit flow tests for Transaction Added attribution */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export interface UsePerpsActionsResult extends UsePerpsMarketForAssetResult {
  /** Handler to navigate to perps order view with direction, undefined if no market exists */
  handlePerpsAction: ((direction: OrderDirection) => void) | undefined;
}

/**
 * usePerpsActions Hook
 *
 * Provides navigation handlers for opening long/short perps positions
 * from the token details screen.
 *
 * Navigation flow (Lite mode):
 * 1. User clicks Long/Short button in Token Details
 * 2. Navigate to PerpsOrderRedirect (inside Perps stack, so WebSocket initializes)
 * 3. PerpsOrderRedirect waits for connection, calls depositWithOrder()
 * 4. PerpsOrderRedirect navigates to confirmation screen with transaction ready
 *
 * This pattern is necessary because:
 * - Token Details is OUTSIDE the Perps stack
 * - depositWithOrder() requires WebSocket to be initialized
 * - WebSocket only initializes inside PerpsConnectionProvider (wraps Perps stack)
 *
 * In Pro mode the order form lives on the market screen itself, so Long/Short
 * opens that screen with the side preselected rather than the Lite one-click
 * order flow.
 *
 * @param params - Token symbol (pass null to disable perps market lookup)
 * @returns Object with hasPerpsMarket, marketData, isLoading, error, handlePerpsAction
 */
export const usePerpsActions = ({
  symbol,
  fromTokenDetails,
  transactionActiveAbTests,
}: UsePerpsActionsParams): UsePerpsActionsResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const isProModeActive = useIsPerpsProModeActive();

  const { hasPerpsMarket, marketData, isLoading, error } =
    usePerpsMarketForAsset(symbol);

  const navigateToOrder = useCallback(
    (direction: OrderDirection) => {
      if (!marketData) return;

      // Pro mode places orders from the inline form on the market screen, so
      // the one-click Lite order flow would drop the user into the wrong
      // experience. Open the Pro market with the side preselected instead.
      if (isProModeActive) {
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: {
            market: marketData,
            direction,
            source: PERPS_EVENT_VALUE.SOURCE.ASSET_DETAIL_SCREEN,
            ...(transactionActiveAbTests?.length
              ? { transactionActiveAbTests }
              : {}),
          },
        });
        return;
      }

      // Navigate to the Perps stack, targeting PerpsOrderRedirect
      // This ensures WebSocket is initialized before calling depositWithOrder()
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.ORDER_REDIRECT,
        params: {
          direction,
          asset: marketData.symbol,
          fromTokenDetails,
          ...(transactionActiveAbTests?.length
            ? { transactionActiveAbTests }
            : {}),
        },
      });
    },
    [
      navigation,
      marketData,
      isProModeActive,
      fromTokenDetails,
      transactionActiveAbTests,
    ],
  );

  return useMemo(
    () => ({
      hasPerpsMarket,
      marketData,
      isLoading,
      error,
      handlePerpsAction: hasPerpsMarket ? navigateToOrder : undefined,
    }),
    [hasPerpsMarket, marketData, isLoading, error, navigateToOrder],
  );
};
