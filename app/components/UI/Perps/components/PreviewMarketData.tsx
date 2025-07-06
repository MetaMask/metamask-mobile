import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import type { Theme } from '../../../../util/theme/models';
import { usePerpsNetwork, usePerpsPrices } from '../hooks/usePerpsController';

interface PreviewMarketDataProps {
  testID?: string;
}

// Top 3 popular assets for preview
const PREVIEW_ASSETS = ['BTC', 'ETH', 'SOL'];

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      marginTop: 24,
      padding: 16,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
    },
    header: {
      marginBottom: 16,
      alignItems: 'center' as const,
    },
    marketRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    lastMarketRow: {
      borderBottomWidth: 0,
    },
    symbolText: {
      fontWeight: '600' as const,
    },
    priceContainer: {
      alignItems: 'flex-end' as const,
    },
    priceText: {
      fontWeight: '500' as const,
    },
  };
};

const PreviewMarketData: React.FC<PreviewMarketDataProps> = ({
  testID = 'preview-market-data',
}) => {
  const { styles } = useStyles(styleSheet, {});
  const currentNetwork = usePerpsNetwork();

  // Get live prices for preview assets
  const prices = usePerpsPrices(PREVIEW_ASSETS);


  const formatPrice = (price: string): string => {
    const numPrice = parseFloat(price);
    if (numPrice >= 1000) {
      return `$${numPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    }
    return `$${numPrice.toFixed(4)}`;
  };

  const renderMarketRow = (symbol: string, index: number) => {
    const priceData = prices[symbol];
    const isLastRow = index === PREVIEW_ASSETS.length - 1;

    return (
      <View
        key={symbol}
        style={[styles.marketRow, isLastRow && styles.lastMarketRow]}
        testID={`${testID}-row-${symbol.toLowerCase()}`}
      >
        <Text
          variant={TextVariant.BodyMD}
          style={styles.symbolText}
          color={TextColor.Default}
        >
          {symbol}
        </Text>

        <View style={styles.priceContainer}>
          {priceData ? (
            <Text
              variant={TextVariant.BodyMD}
              style={styles.priceText}
              color={TextColor.Default}
              testID={`${testID}-price-${symbol.toLowerCase()}`}
            >
              {formatPrice(priceData.price)}
            </Text>
          ) : (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Muted}
              testID={`${testID}-loading-${symbol.toLowerCase()}`}
            >
              Loading...
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          Live Market Prices
        </Text>
        <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
          {currentNetwork.toUpperCase()} • Real-time via WebSocket
        </Text>
      </View>

      {PREVIEW_ASSETS.map((symbol, index) =>
        renderMarketRow(symbol, index)
      )}
    </View>
  );
};

export default PreviewMarketData;
