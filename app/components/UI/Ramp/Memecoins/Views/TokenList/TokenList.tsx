import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  Box,
  HeaderStandard,
  Text,
  TextFieldSearch,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import {
  fetchCrossmintMemecoinTokens,
  isCrossmintConfigured,
  type CrossmintMemecoinToken,
} from '../../crossmint';
import MemecoinTokenRow from '../../components/MemecoinTokenRow';
import { useMemecoinMarketData } from '../../hooks/useMemecoinMarketData';
import { MEMECOINS_TEST_IDS } from '../../Memecoins.testIds';

export const createMemecoinsNavDetails = createNavigationDetails(
  Routes.RAMP.MEMECOINS.ROOT,
);

const SKELETON_COUNT = 8;

function TokenList() {
  const navigation = useNavigation<AppNavigationProp>();
  const [tokens, setTokens] = useState<CrossmintMemecoinToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { marketDataByLocator } = useMemecoinMarketData(tokens);

  const loadTokens = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!isCrossmintConfigured()) {
      setError(strings('memecoins.missing_api_key'));
      setIsLoading(false);
      return;
    }

    try {
      const result = await fetchCrossmintMemecoinTokens({
        chains: 'solana',
        limit: 30,
      });
      setTokens(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : strings('memecoins.token_list_error'),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const filteredTokens = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return tokens;
    }

    return tokens.filter((token) => {
      const market = marketDataByLocator[token.tokenLocator];
      const name = (market?.name || token.name).toLowerCase();
      const symbol = (market?.symbol || token.symbol).toLowerCase();
      const address = token.address.toLowerCase();
      return (
        name.includes(query) ||
        symbol.includes(query) ||
        address.includes(query)
      );
    });
  }, [marketDataByLocator, searchQuery, tokens]);

  const handleSelectToken = useCallback(
    (token: CrossmintMemecoinToken) => {
      const market = marketDataByLocator[token.tokenLocator];
      navigation.navigate(Routes.RAMP.MEMECOINS.AMOUNT, {
        tokenLocator: token.tokenLocator,
        chain: token.chain,
        name: market?.name || token.name,
        symbol: market?.symbol || token.symbol,
        imageUrl: market?.imageUrl || token.imageUrl,
      });
    },
    [marketDataByLocator, navigation],
  );

  const showSkeletons = isLoading && tokens.length === 0;

  const listEmptyMessage =
    !isLoading && !error && filteredTokens.length === 0
      ? searchQuery.trim()
        ? strings('memecoins.search_empty')
        : strings('memecoins.token_list_empty')
      : null;

  const renderItem = useCallback(
    ({ item }: { item: CrossmintMemecoinToken }) => (
      <MemecoinTokenRow
        token={item}
        marketData={marketDataByLocator[item.tokenLocator]}
        onPress={handleSelectToken}
      />
    ),
    [handleSelectToken, marketDataByLocator],
  );

  return (
    <ScreenLayout testID={MEMECOINS_TEST_IDS.TOKEN_LIST_SCREEN}>
      <HeaderStandard
        title={strings('memecoins.token_list_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <Box
        twClassName="px-4 pb-3"
        testID={MEMECOINS_TEST_IDS.TOKEN_LIST_SEARCH}
      >
        <TextFieldSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={strings('memecoins.search_placeholder')}
          onPressClearButton={() => setSearchQuery('')}
          autoFocus={false}
          clearButtonProps={{
            testID: MEMECOINS_TEST_IDS.TOKEN_LIST_SEARCH_CLEAR,
          }}
          inputProps={{
            autoCapitalize: 'none',
            autoCorrect: false,
            testID: MEMECOINS_TEST_IDS.TOKEN_LIST_SEARCH_INPUT,
          }}
        />
      </Box>
      <ScreenLayout.Body>
        {showSkeletons ? (
          <Box
            twClassName="px-4"
            testID={MEMECOINS_TEST_IDS.TOKEN_LIST_LOADING}
          >
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <TrendingTokensSkeleton key={`memecoin-skeleton-${index}`} />
            ))}
          </Box>
        ) : error ? (
          <Box
            twClassName="flex-1 items-center justify-center px-6 gap-3"
            testID={MEMECOINS_TEST_IDS.TOKEN_LIST_ERROR}
          >
            <Text variant={TextVariant.BodyMd} twClassName="text-center">
              {error}
            </Text>
            <Pressable onPress={loadTokens}>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName="text-primary-default"
              >
                {strings('memecoins.retry')}
              </Text>
            </Pressable>
          </Box>
        ) : (
          <FlatList
            data={filteredTokens}
            keyExtractor={(item) => item.tokenLocator}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={loadTokens} />
            }
            ListEmptyComponent={
              listEmptyMessage ? (
                <Box twClassName="px-6 py-10 items-center">
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="text-text-alternative text-center"
                  >
                    {listEmptyMessage}
                  </Text>
                </Box>
              ) : null
            }
          />
        )}
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default TokenList;
