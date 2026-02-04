import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { usePerpsMarketForAsset } from '../../Perps/hooks/usePerpsMarketForAsset';
import Routes from '../../../../constants/navigation/Routes';
import { PerpsEventValues } from '../../Perps/constants/eventNames';

export interface UsePerpsActionsParams {
  symbol: string;
}

export interface UsePerpsActionsResult {
  hasPerpsMarket: boolean;
  isLoading: boolean;
  handlePerpsAction: (() => void) | undefined;
}

/**
 * usePerpsActions Hook
 *
 * Provides navigation handlers for opening long/short perps positions
 * from the token details screen.
 *
 * Both Long and Short buttons navigate to Market Details page where
 * users can complete the full trading flow within the Perps stack.
 *
 * @param params - Token symbol and perps feature flag
 * @returns Object with hasPerpsMarket, handleLong, handleShort
 */
export const usePerpsActions = ({
  symbol,
}: UsePerpsActionsParams): UsePerpsActionsResult => {
  const navigation = useNavigation();

  const { hasPerpsMarket, marketData, isLoading } =
    usePerpsMarketForAsset(symbol);

  const navigateToMarketDetails = useCallback(() => {
    if (!marketData) return;

    navigation.navigate(Routes.PERPS.ROOT as never, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: marketData,
        source: PerpsEventValues.SOURCE.ASSET_DETAIL_SCREEN,
      },
    } as never);
  }, [navigation, marketData]);

  return useMemo(
    () => ({
      hasPerpsMarket,
      isLoading,
      handlePerpsAction: hasPerpsMarket ? navigateToMarketDetails : undefined,
    }),
    [hasPerpsMarket, isLoading, navigateToMarketDetails],
  );
};
