import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { useAppThemeFromContext } from '../../../../util/theme';
import { Theme } from '../../../../util/theme/models';
import HeaderBase from '../../../../component-library/components/HeaderBase';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import TrendingTokensList from '../TrendingTokensSection/TrendingTokensList/TrendingTokensList';
import TrendingTokensSkeleton from '../TrendingTokensSection/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { useTrendingRequest } from '../../../UI/Assets/hooks/useTrendingRequest';
import { TrendingAsset } from '@metamask/assets-controllers';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

interface TrendingTokensNavigationParamList {
  [key: string]: undefined | object;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
      paddingBottom: 16,
    },
    header: {
      padding: 16,
    },
    cardContainer: {
      margin: 16,
      borderRadius: 16,
      backgroundColor: theme.colors.background.muted,
      padding: 16,
    },
    listContainer: {
      flex: 1,
      paddingLeft: 16,
      paddingRight: 16,
    },
  });

const MAX_TOKENS = 100;

const TrendingTokensFullView = () => {
  const navigation =
    useNavigation<StackNavigationProp<TrendingTokensNavigationParamList>>();
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const { results: trendingTokensResults, isLoading } = useTrendingRequest({});
  // display only top 100 tokens
  const trendingTokens = useMemo(
    () => trendingTokensResults.slice(0, MAX_TOKENS),
    [trendingTokensResults],
  );

  const handleTokenPress = useCallback((token: TrendingAsset) => {
    // TODO: Implement token press logic
    // eslint-disable-next-line no-console
    console.log('🚀 ~ TrendingTokensFullView ~ token:', token);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBase
        startAccessory={
          <ButtonIcon
            size={ButtonIconSizes.Lg}
            onPress={handleBackPress}
            iconName={IconName.ArrowLeft}
            testID="back-button"
          />
        }
        style={styles.header}
      >
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {strings('trending.trending_tokens')}
        </Text>
      </HeaderBase>
      {isLoading || trendingTokensResults.length === 0 ? (
        <View style={styles.listContainer}>
          <TrendingTokensSkeleton count={MAX_TOKENS} />
        </View>
      ) : (
        <View style={styles.listContainer}>
          <TrendingTokensList
            trendingTokens={trendingTokens}
            onTokenPress={handleTokenPress}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

TrendingTokensFullView.displayName = 'TrendingTokensFullView';

export default TrendingTokensFullView;
