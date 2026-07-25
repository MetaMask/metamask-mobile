import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { formatPriceWithSubscriptNotation } from '../../../Predict/utils/format';
import { formatPercentChange } from '../../../Trending/utils/formatPercentChange';
import type { CrossmintMemecoinToken } from '../crossmint/types';
import type { MemecoinMarketData } from '../hooks/useMemecoinMarketData';
import { MEMECOINS_TEST_IDS } from '../Memecoins.testIds';

interface MemecoinTokenRowProps {
  token: CrossmintMemecoinToken;
  marketData?: MemecoinMarketData;
  onPress: (token: CrossmintMemecoinToken) => void;
}

const styles = StyleSheet.create({
  tokenAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});

function MemecoinTokenRow({
  token,
  marketData,
  onPress,
}: MemecoinTokenRowProps) {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const name = marketData?.name || token.name;
  const symbol = marketData?.symbol || token.symbol;
  const imageUrl = marketData?.imageUrl || token.imageUrl;

  const priceLabel = useMemo(() => {
    if (marketData?.price === undefined || !Number.isFinite(marketData.price)) {
      return '—';
    }
    return formatPriceWithSubscriptNotation(
      marketData.price,
      (currentCurrency || 'usd').toUpperCase(),
    );
  }, [currentCurrency, marketData?.price]);

  const percent = useMemo(
    () => formatPercentChange(marketData?.priceChange1d),
    [marketData?.priceChange1d],
  );

  return (
    <Pressable
      testID={`${MEMECOINS_TEST_IDS.TOKEN_LIST_ITEM}-${symbol}`}
      onPress={() => onPress(token)}
    >
      <Box twClassName="flex-row items-center gap-3 px-4 py-3">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.tokenAvatar} />
        ) : (
          <Box twClassName="w-10 h-10 rounded-full bg-background-muted items-center justify-center">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
              {symbol.slice(0, 1)}
            </Text>
          </Box>
        )}
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-text-alternative"
            numberOfLines={1}
          >
            {symbol}
          </Text>
        </Box>
        <Box twClassName="items-end">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {priceLabel}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={percent.changeTextColor}
            testID={`${MEMECOINS_TEST_IDS.TOKEN_LIST_ITEM_CHANGE}-${symbol}`}
          >
            {percent.changeLabel ?? '—'}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
}

export default MemecoinTokenRow;
