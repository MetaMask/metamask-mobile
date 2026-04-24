import React, { useCallback } from 'react';
import { StackActions } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { isCaipChainId, type CaipChainId } from '@metamask/utils';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../../../selectors/networkController';
import { useAddPopularNetwork } from '../../../../../../hooks/useAddPopularNetwork';
import { PopularList } from '../../../../../../../util/networks/customNetworks';
import { TokenDetailsSource } from '../../../../../../UI/TokenDetails/constants/constants';
import { getAssetNavigationParams } from '../../../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { getPriceChangeFieldKey } from '../../../../../../UI/Trending/components/TrendingTokenRowItem/utils';
import {
  TimeOption,
  PriceChangeOption,
} from '../../../../../../UI/Trending/components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../../../../../UI/Trending/components/TrendingTokensList/TrendingTokensList';
import TrendingFeedSessionManager from '../../../../../../UI/Trending/services/TrendingFeedSessionManager';
import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import SectionPill from '../SectionPills/SectionPill';

/** Analytics context for crypto movers on the home feed (volume-sorted, 24h). */
const CRYPTO_MOVERS_PILL_FILTER_CONTEXT: TrendingFilterContext = {
  timeFilter: TimeOption.TwentyFourHours,
  sortOption: PriceChangeOption.Volume,
  networkFilter: 'all',
  isSearchResult: false,
};

const sessionManager = TrendingFeedSessionManager.getInstance();

/**
 * Compact pill row for the Crypto movers section (explore home / crypto tab).
 * Analytics and navigation match `TrendingTokenRowItem` for that section.
 */
const CryptoMoversPillItem: React.FC<{
  item: unknown;
  index: number;
  navigation: AppNavigationProp;
  extra?: unknown;
}> = ({ item, index, navigation }) => {
  const token = item as TrendingAsset;
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );
  const { addPopularNetwork } = useAddPopularNetwork();

  const onPress = useCallback(async () => {
    const assetParams = getAssetNavigationParams(
      token,
      TokenDetailsSource.Trending,
    );
    if (!assetParams) return;

    const caipChainId = token.assetId.split('/')[0];
    const key = getPriceChangeFieldKey(TimeOption.TwentyFourHours);
    const rawPct = token.priceChangePct?.[key];
    const pricePercentChange = rawPct ? parseFloat(String(rawPct)) : 0;

    sessionManager.trackTokenClick({
      token_symbol: token.symbol,
      token_address: assetParams.address,
      token_name: token.name,
      chain_id: assetParams.chainId,
      position: index,
      price_usd: parseFloat(token.price) || 0,
      price_change_pct: pricePercentChange,
      time_filter: CRYPTO_MOVERS_PILL_FILTER_CONTEXT.timeFilter,
      sort_option:
        CRYPTO_MOVERS_PILL_FILTER_CONTEXT.sortOption ??
        PriceChangeOption.PriceChange,
      network_filter: CRYPTO_MOVERS_PILL_FILTER_CONTEXT.networkFilter,
      is_search_result: CRYPTO_MOVERS_PILL_FILTER_CONTEXT.isSearchResult,
    });

    const isNetworkAdded = isCaipChainId(caipChainId)
      ? Boolean(networkConfigurations[caipChainId as CaipChainId])
      : true;
    if (!isNetworkAdded) {
      const popularNetwork = PopularList.find(
        (n) => n.chainId === assetParams.chainId,
      );
      if (popularNetwork) {
        try {
          await addPopularNetwork(popularNetwork);
        } catch (error) {
          console.error('Failed to add network:', error);
          return;
        }
      }
    }

    navigation.dispatch(StackActions.push('Asset', assetParams));
  }, [token, index, navigation, networkConfigurations, addPopularNetwork]);

  return (
    <SectionPill
      token={token}
      onPress={onPress}
      testID={`section-pill-${token.assetId}`}
    />
  );
};

export default CryptoMoversPillItem;
