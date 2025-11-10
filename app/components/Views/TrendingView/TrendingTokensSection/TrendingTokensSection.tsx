import React, { useCallback, useMemo } from 'react';
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
import { useTrendingRequest } from '../../../UI/Assets/hooks/useTrendingRequest';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import { formatChainIdToCaip } from '@metamask/bridge-controller';

const TrendingTokensSection = () => {
  const { styles } = useStyles(styleSheet, {});

  const { enabledNetworks } = useCurrentNetworkInfo();
  //memoize the caipChainIds
  const caipChainIds = useMemo(
    () =>
      enabledNetworks.map((network) => formatChainIdToCaip(network.chainId)),
    [enabledNetworks],
  );
  const { results: trendingTokensResults, isLoading } = useTrendingRequest({
    chainIds: caipChainIds,
  });
  const trendingTokens = trendingTokensResults.slice(0, 3);

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
