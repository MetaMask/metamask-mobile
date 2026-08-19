import { useCallback } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { getAssetNavigationParams } from '../../components/TrendingTokenRowItem/TrendingTokenRowItem';
import { getPriceChangeFieldKey } from '../../components/TrendingTokenRowItem/utils';
import TrendingFeedSessionManager from '../../services/TrendingFeedSessionManager';
import { useAddNetworkIfMissingMutation } from '../../../../hooks/useAddNetworkIfMissing/useAddNetworkIfMissing';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import {
  TimeOption,
  PriceChangeOption,
} from '../../components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../components/TrendingTokensList/TrendingTokensList';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  isWatchlistTokenListItemSource,
  trackTokenListItemClicked,
} from '../../../Assets/watchlist/utils/trackTokenListItemClicked';

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
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { mutate: addNetworkIfMissing } = useAddNetworkIfMissingMutation();

  const onPress = useCallback(async () => {
    if (
      isWatchlistTokenListItemSource(tokenDetailsSource) &&
      index !== undefined
    ) {
      trackTokenListItemClicked(trackEvent, createEventBuilder, {
        asset: String(token.assetId),
        source: tokenDetailsSource,
        position: index,
      });
    }

    const assetParams = getAssetNavigationParams(
      token,
      tokenDetailsSource,
      transactionActiveAbTests,
    );
    if (!assetParams) return;

    if (index !== undefined && filterContext) {
      const key = getPriceChangeFieldKey(selectedTimeOption);
      const rawPct = token.priceChangePct?.[key];
      const pricePercentChange = rawPct ? parseFloat(String(rawPct)) : 0;

      TrendingFeedSessionManager.getInstance().trackTokenClick({
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

    // Navigate only once the chain is in the user's network list, otherwise
    // Token Details has no price, balance or gas estimates to show.
    addNetworkIfMissing(assetParams.chainId, {
      onSuccess: () =>
        navigation.dispatch(StackActions.push('Asset', assetParams)),
    });
  }, [
    token,
    index,
    filterContext,
    tokenDetailsSource,
    transactionActiveAbTests,
    selectedTimeOption,
    navigation,
    addNetworkIfMissing,
    trackEvent,
    createEventBuilder,
  ]);

  return { onPress };
};
