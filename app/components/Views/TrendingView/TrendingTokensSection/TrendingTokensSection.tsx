import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { TrendingAsset } from '@metamask/assets-controllers';
import { useAppThemeFromContext } from '../../../../util/theme';
import { Theme } from '../../../../util/theme/models';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import TrendingTokensSkeleton from './TrendingTokenSkeleton/TrendingTokensSkeleton';
import TrendingTokensList from './TrendingTokensList';
import Card from '../../../../component-library/components/Cards/Card';
import { useTrendingRequest } from '../../../UI/Assets/hooks/useTrendingRequest';
import Routes from '../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 4,
      marginBottom: 8,
    },
    contentContainer: {
      marginHorizontal: 16,
      borderRadius: 16,
      paddingTop: 12,
      backgroundColor: theme.colors.background.muted,
    },
    cardContainer: {
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background.muted,
      borderColor: theme.colors.border.muted,
    },
  });

const TrendingTokensSection = () => {
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const { results: trendingTokensResults, isLoading } = useTrendingRequest({});
  const trendingTokens = trendingTokensResults.slice(0, 3);

  const handleViewAll = useCallback(() => {
    // TODO: Implement view all logic
    navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW);
  }, [navigation]);

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
          {strings('trending.tokens')}
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

  // Show skeleton during initial load or when there are no tokens
  if (isLoading || trendingTokens.length === 0) {
    return (
      <View>
        <SectionHeader />
        <Card style={styles.cardContainer} disabled>
          <TrendingTokensSkeleton count={3} />
        </Card>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader />
      <Card style={styles.cardContainer} disabled>
        <TrendingTokensList
          trendingTokens={trendingTokens}
          onTokenPress={handleTokenPress}
        />
      </Card>
    </View>
  );
};

export default TrendingTokensSection;
