import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { TrendingAsset } from '@metamask/assets-controllers';
import { useStyles } from '../../../hooks/useStyles';
import styleSheet from './TrendingTokensSection.styles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import TrendingTokensSkeleton from './TrendingTokensSkeleton';
import TrendingTokensList from './TrendingTokensList';
import Card from '../../../../component-library/components/Cards/Card';

const TrendingTokensSection = () => {
  const { styles } = useStyles(styleSheet, {});
  // Just for testing, should use the hook to get the trending tokens
  const trendingTokens: TrendingAsset[] = [
    {
      assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      name: 'USDC',
      symbol: 'USDC',
      decimals: 6,
      price: '1.00135763432467',
      aggregatedUsdVolume: 974248822.2,
      marketCap: 75641301011.76,
    },
    {
      assetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      name: 'ETHOS',
      symbol: 'WETH',
      decimals: 18,
      price: '3237.13163549216',
      aggregatedUsdVolume: 239897442.75,
      marketCap: 6811168259.14,
    },
    {
      assetId: 'eip155:1/erc20:0x514910771af9ca656af840dff83e8264ecf986ca',
      name: 'LINK',
      symbol: 'LINK',
      decimals: 18,
      price: '14.5922994020068',
      aggregatedUsdVolume: 9309610.43,
      marketCap: 10173362529.96,
    },
  ];
  const isLoading = false;
  const handleViewAll = useCallback(() => {
    // TODO: Implement view all logic
  }, []);

  const handleTokenPress = useCallback((token: TrendingAsset) => {
    // eslint-disable-next-line no-console
    console.log('🚀 ~ TrendingTokensSection ~ token:', token);
    // TODO: Implement token press logic
  }, []);

  // Header component
  const SectionHeader = useCallback(
    () => (
      <View style={styles.header}>
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {'Tokens'}
        </Text>
        <TouchableOpacity onPress={handleViewAll}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
            {strings('trending.view_all')}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [styles.header, handleViewAll],
  );

  // Show skeleton during initial load
  if (isLoading) {
    return (
      <View>
        <SectionHeader />
        <Card style={styles.cardContainer}>
          <TrendingTokensSkeleton count={3} />
        </Card>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader />
      <Card style={styles.cardContainer}>
        <TrendingTokensList
          trendingTokens={trendingTokens}
          onTokenPress={handleTokenPress}
        />
      </Card>
    </View>
  );
};

export default TrendingTokensSection;
