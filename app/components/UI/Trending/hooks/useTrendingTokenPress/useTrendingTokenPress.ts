import { useCallback } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { isCaipChainId, type CaipChainId } from '@metamask/utils';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { getAssetNavigationParams } from '../../components/TrendingTokenRowItem/TrendingTokenRowItem';
import { getPriceChangeFieldKey } from '../../components/TrendingTokenRowItem/utils';
import TrendingFeedSessionManager from '../../services/TrendingFeedSessionManager';
import { useAddPopularNetwork } from '../../../../hooks/useAddPopularNetwork';
import { PopularList } from '../../../../../util/networks/customNetworks';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import {
  TimeOption,
  PriceChangeOption,
} from '../../components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../components/TrendingTokensList/TrendingTokensList';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

const sessionManager = TrendingFeedSessionManager.getInstance();

export const useTrendingTokenPress = ({
  token,
  index,
  filterContext,
  tokenDetailsSource = TokenDetailsSource.Trending,
  transactionActiveAbTests,
  selectedTimeOption = TimeOption.TwentyFourHours,
}: {
  token: TrendingAsset;
  index?: number;
  filterContext?: TrendingFilterContext;
  tokenDetailsSource?: TokenDetailsSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  selectedTimeOption?: TimeOption;
}): { onPress: () => Promise<void> } => {
  const navigation = useNavigation<AppNavigationProp>();
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );
  const { addPopularNetwork } = useAddPopularNetwork();

  const onPress = useCallback(async () => {
    const assetParams = getAssetNavigationParams(
      token,
      tokenDetailsSource,
      transactionActiveAbTests,
    );
    if (!assetParams) return;

    const caipChainId = token.assetId.split('/')[0];

    if (index !== undefined && filterContext) {
      const key = getPriceChangeFieldKey(selectedTimeOption);
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
        time_filter: filterContext.timeFilter,
        sort_option: filterContext.sortOption ?? PriceChangeOption.PriceChange,
        network_filter: filterContext.networkFilter,
        is_search_result: filterContext.isSearchResult,
      });
    }

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
  }, [
    token,
    index,
    filterContext,
    tokenDetailsSource,
    transactionActiveAbTests,
    selectedTimeOption,
    navigation,
    networkConfigurations,
    addPopularNetwork,
  ]);

  return { onPress };
};
