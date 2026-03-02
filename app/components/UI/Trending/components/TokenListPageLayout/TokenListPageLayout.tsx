import React from 'react';
import { Platform, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useAppThemeFromContext } from '../../../../../util/theme';
import { TrendingListHeader } from '../TrendingListHeader';
import FilterBar from '../FilterBar/FilterBar';
import {
  TrendingTokenNetworkBottomSheet,
  TrendingTokenPriceChangeBottomSheet,
} from '../TrendingTokensBottomSheet';
import { TrendingTokensData } from '../../Views/TrendingTokensFullView/TrendingTokensFullView';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import type { TokenListFilters } from '../../hooks/useTokenListFilters/useTokenListFilters';

export interface TokenListPageLayoutProps {
  /** Page title displayed in the header */
  title: string;
  /** Base testID used to derive sub-component testIDs */
  testID: string;
  /** Filter state & handlers from useTokenListFilters */
  filters: TokenListFilters;
  /** Token data to display */
  tokens: TrendingAsset[];
  /** Search results (may differ from tokens if client-side filtering is applied) */
  searchResults: TrendingAsset[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Callback to trigger data refetch */
  onRefresh: () => void;
  /** Networks to show in the network filter bottom sheet */
  allowedNetworks: ProcessedNetwork[];
  /** Optional extra filter buttons (e.g., time filter) */
  extraFilters?: React.ReactNode;
  /** Optional extra bottom sheets rendered at the end */
  extraBottomSheets?: React.ReactNode;
}

/**
 * Shared page layout for token list full-screen views.
 *
 * Renders SafeAreaView shell, TrendingListHeader with search,
 * FilterBar with price-change / network buttons,
 * TrendingTokensData (skeleton / empty states / token list),
 * and Network & price-change bottom sheets.
 */
const TokenListPageLayout: React.FC<TokenListPageLayoutProps> = ({
  title,
  testID,
  filters,
  tokens,
  searchResults,
  isLoading,
  onRefresh,
  allowedNetworks,
  extraFilters,
  extraBottomSheets,
}) => {
  const tw = useTailwind();
  const theme = useAppThemeFromContext();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={tw`flex-1 bg-default`}
      edges={
        Platform.OS === 'ios' ? ['left', 'right'] : ['left', 'right', 'bottom']
      }
    >
      <View style={tw.style('bg-default', { paddingTop: insets.top })}>
        <TrendingListHeader
          title={title}
          isSearchVisible={filters.isSearchVisible}
          searchQuery={filters.searchQuery}
          onSearchQueryChange={filters.handleSearchQueryChange}
          onBack={filters.handleBackPress}
          onSearchToggle={filters.handleSearchToggle}
          testID={testID}
        />
      </View>

      {!filters.isSearchVisible ? (
        <FilterBar
          priceChangeButtonText={filters.priceChangeButtonText}
          onPriceChangePress={filters.handlePriceChangePress}
          isPriceChangeDisabled={searchResults.length === 0}
          networkName={filters.selectedNetworkName}
          onNetworkPress={filters.handleAllNetworksPress}
          extraFilters={extraFilters}
        />
      ) : null}

      <TrendingTokensData
        isLoading={isLoading}
        refreshing={filters.refreshing}
        trendingTokens={tokens}
        search={{ searchResults, searchQuery: filters.searchQuery }}
        handleRefresh={onRefresh}
        selectedTimeOption={filters.selectedTimeOption}
        filterContext={filters.filterContext}
        theme={theme}
      />

      <TrendingTokenNetworkBottomSheet
        isVisible={filters.showNetworkBottomSheet}
        onClose={() => filters.setShowNetworkBottomSheet(false)}
        onNetworkSelect={filters.handleNetworkSelect}
        selectedNetwork={filters.selectedNetwork}
        networks={allowedNetworks}
      />
      <TrendingTokenPriceChangeBottomSheet
        isVisible={filters.showPriceChangeBottomSheet}
        onClose={() => filters.setShowPriceChangeBottomSheet(false)}
        onPriceChangeSelect={filters.handlePriceChangeSelect}
        selectedOption={filters.selectedPriceChangeOption}
        sortDirection={filters.priceChangeSortDirection}
      />
      {extraBottomSheets}
    </SafeAreaView>
  );
};

TokenListPageLayout.displayName = 'TokenListPageLayout';

export default TokenListPageLayout;
