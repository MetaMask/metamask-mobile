import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import {
  fetchCrossmintMemecoinTokens,
  isCrossmintConfigured,
  type CrossmintMemecoinToken,
} from '../../crossmint';
import { MEMECOINS_TEST_IDS } from '../../Memecoins.testIds';

export const createMemecoinsNavDetails = createNavigationDetails(
  Routes.RAMP.MEMECOINS.ROOT,
);

function TokenList() {
  const navigation = useNavigation<AppNavigationProp>();
  const [tokens, setTokens] = useState<CrossmintMemecoinToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleSelectToken = useCallback(
    (token: CrossmintMemecoinToken) => {
      navigation.navigate(Routes.RAMP.MEMECOINS.AMOUNT, {
        tokenLocator: token.tokenLocator,
        chain: token.chain,
        name: token.name,
        symbol: token.symbol,
        imageUrl: token.imageUrl,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: CrossmintMemecoinToken }) => (
      <Pressable
        testID={`${MEMECOINS_TEST_IDS.TOKEN_LIST_ITEM}-${item.symbol}`}
        onPress={() => handleSelectToken(item)}
      >
        <Box
          twClassName="flex-row items-center gap-3 px-4 py-3 border-b border-border-muted"
        >
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />
          ) : (
            <Box twClassName="w-10 h-10 rounded-full bg-background-muted items-center justify-center">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
                {item.symbol.slice(0, 1)}
              </Text>
            </Box>
          )}
          <Box twClassName="flex-1">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {item.name}
            </Text>
            <Text variant={TextVariant.BodySm} twClassName="text-text-alternative">
              {item.symbol} · {item.chain}
            </Text>
          </Box>
        </Box>
      </Pressable>
    ),
    [handleSelectToken],
  );

  return (
    <ScreenLayout testID={MEMECOINS_TEST_IDS.TOKEN_LIST_SCREEN}>
      <HeaderStandard
        title={strings('memecoins.token_list_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScreenLayout.Body>
        {isLoading && tokens.length === 0 ? (
          <Box
            twClassName="flex-1 items-center justify-center"
            testID={MEMECOINS_TEST_IDS.TOKEN_LIST_LOADING}
          >
            <ActivityIndicator />
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
            data={tokens}
            keyExtractor={(item) => item.tokenLocator}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={loadTokens} />
            }
          />
        )}
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default TokenList;
