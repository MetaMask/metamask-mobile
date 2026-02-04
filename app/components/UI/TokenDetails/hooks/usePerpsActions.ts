import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  usePerpsMarketForAsset,
  type UsePerpsMarketForAssetResult,
} from '../../Perps/hooks/usePerpsMarketForAsset';
import Routes from '../../../../constants/navigation/Routes';
import { PerpsEventValues } from '../../Perps/constants/eventNames';

export interface UsePerpsActionsParams {
  /** Token symbol, or null to skip the perps market check */
  symbol: string | null;
}

export interface UsePerpsActionsResult extends UsePerpsMarketForAssetResult {
  /** Handler to navigate to perps market details, undefined if no market exists */
  handlePerpsAction: (() => void) | undefined;
}

/**
 * usePerpsActions Hook
 *
 * Provides navigation handlers for opening long/short perps positions
 * from the token details screen.
 *
 * @param params - Token symbol (pass null to disable perps market lookup)
 * @returns Object with hasPerpsMarket, marketData, isLoading, error, handlePerpsAction
 */
export const usePerpsActions = ({
  symbol,
}: UsePerpsActionsParams): UsePerpsActionsResult => {
  const navigation = useNavigation();

  const { hasPerpsMarket, marketData, isLoading, error } =
    usePerpsMarketForAsset(symbol);

  const navigateToMarketDetails = useCallback(() => {
    if (!marketData) return;

    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: marketData,
        source: PerpsEventValues.SOURCE.ASSET_DETAIL_SCREEN,
      },
    });
  }, [navigation, marketData]);

  return useMemo(
    () => ({
      hasPerpsMarket,
      marketData,
      isLoading,
      error,
      handlePerpsAction: hasPerpsMarket ? navigateToMarketDetails : undefined,
    }),
    [hasPerpsMarket, marketData, isLoading, error, navigateToMarketDetails],
  );
};
