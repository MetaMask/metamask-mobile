import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  usePerpsMarketForAsset,
  type UsePerpsMarketForAssetResult,
} from '../../Perps/hooks/usePerpsMarketForAsset';
import Routes from '../../../../constants/navigation/Routes';
import {
  PERPS_EVENT_VALUE,
  type OrderDirection,
} from '@metamask/perps-controller';

export interface UsePerpsActionsParams {
  /** Token symbol, or null to skip the perps market check */
  symbol: string | null;
  /** A/B test variant for token details layout - e.g. 'control' or 'treatment' */
  abTestTokenDetailsLayout?: string;
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
 * Navigation flow:
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
 * @param params - Token symbol (pass null to disable perps market lookup)
 * @returns Object with hasPerpsMarket, marketData, isLoading, error, handlePerpsAction
 */
export const usePerpsActions = ({
  symbol,
  abTestTokenDetailsLayout,
}: UsePerpsActionsParams): UsePerpsActionsResult => {
  const navigation = useNavigation();

  const { hasPerpsMarket, marketData, isLoading, error } =
    usePerpsMarketForAsset(symbol);

  const navigateToOrder = useCallback(
    (direction: OrderDirection) => {
      if (!marketData) return;

      // Navigate to the Perps stack, targeting PerpsOrderRedirect
      // This ensures WebSocket is initialized before calling depositWithOrder()
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.ORDER_REDIRECT,
        params: {
          direction,
          asset: marketData.symbol,
          source: PERPS_EVENT_VALUE.SOURCE.ASSET_DETAIL_SCREEN,
          ...(abTestTokenDetailsLayout && {
            ab_test_token_details_layout: abTestTokenDetailsLayout,
          }),
        },
      });
    },
    [navigation, marketData, abTestTokenDetailsLayout],
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
