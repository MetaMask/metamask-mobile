import { useCallback } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import type { RelatedAsset } from '@metamask/ai-controllers';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import Routes from '../../../../constants/navigation/Routes';

interface UseTradeNavigationResult {
  /** Navigate to the Perps market details view. No-op when `canTrade` is false. */
  handleTrade: () => void;
  /** True when the asset has at least one `hlPerpsMarket` entry. */
  canTrade: boolean;
}

/**
 * Provides a stable `handleTrade` callback and a `canTrade` flag for an asset.
 * `handleTrade` is always a valid function — it is a no-op when the asset has
 * no `hlPerpsMarket` entry. Use `canTrade` to decide whether to show a Trade
 * button at all.
 */
const useTradeNavigation = (asset: RelatedAsset): UseTradeNavigationResult => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const hlPerpsMarket = asset.hlPerpsMarket?.[0];

  const handleTrade = useCallback(() => {
    if (!hlPerpsMarket) return;
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: { symbol: hlPerpsMarket, name: asset.name },
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      },
    });
  }, [navigation, hlPerpsMarket, asset.name]);

  return { handleTrade, canTrade: Boolean(hlPerpsMarket) };
};

export default useTradeNavigation;
