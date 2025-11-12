import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useAppThemeFromContext } from '../../../../util/theme';
import { Theme } from '../../../../util/theme/models';
import HeaderBase, {
  HeaderBaseVariant,
} from '../../../../component-library/components/HeaderBase';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import TrendingTokensList from '../TrendingTokensSection/TrendingTokensList/TrendingTokensList';
import TrendingTokensSkeleton from '../TrendingTokensSection/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { useTrendingRequest } from '../../../UI/Assets/hooks/useTrendingRequest';
import { TrendingAsset, SortTrendingBy } from '@metamask/assets-controllers';
import {
  createTrendingTokenTimeBottomSheetNavDetails,
  TimeOption,
} from '../TrendingTokensBottomSheet';
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
      paddingTop: 16,
      paddingBottom: 0,
      paddingHorizontal: 16,
      alignItems: 'center',
      gap: 8,
      alignSelf: 'stretch',
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
    controlBarWrapper: {
      flexDirection: 'row',
      paddingVertical: 16,
      paddingHorizontal: 16,
      justifyContent: 'space-between',
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    controlButtonOuterWrapper: {
      flexDirection: 'row',
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    controlButtonInnerWrapper: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      flexShrink: 0,
    },
    controlButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: theme.colors.background.muted,
    },
    controlButtonRight: {
      padding: 8,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: theme.colors.background.muted,
    },
    controlButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    controlButtonText: {
      color: theme.colors.text.default,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 19.6, // 140% of 14px
      fontStyle: 'normal',
    },
  });

const MAX_TOKENS = 100;

const TrendingTokensFullView = () => {
  const navigation =
    useNavigation<StackNavigationProp<TrendingTokensNavigationParamList>>();
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sortBy, setSortBy] = useState<SortTrendingBy | undefined>(undefined);
  const [selectedTimeOption, setSelectedTimeOption] = useState<TimeOption>(
    TimeOption.TwentyFourHours,
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const { results: trendingTokensResults, isLoading } = useTrendingRequest({
    sortBy,
  });
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

  const handlePriceChangePress = useCallback(() => {
    // TODO: Implement price change filter logic
  }, []);

  const handleAllNetworksPress = useCallback(() => {
    // TODO: Implement network filter logic
  }, []);

  const handleTimeSelect = useCallback(
    (selectedSortBy: SortTrendingBy, timeOption: TimeOption) => {
      setSortBy(selectedSortBy);
      setSelectedTimeOption(timeOption);
    },
    [],
  );

  const handle24hPress = useCallback(() => {
    navigation.navigate(
      ...createTrendingTokenTimeBottomSheetNavDetails({
        onTimeSelect: handleTimeSelect,
        selectedTime: selectedTimeOption,
      }),
    );
  }, [navigation, handleTimeSelect, selectedTimeOption]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBase
        variant={HeaderBaseVariant.Display}
        startAccessory={
          <ButtonIcon
            size={ButtonIconSizes.Lg}
            onPress={handleBackPress}
            iconName={IconName.ArrowLeft}
            testID="back-button"
          />
        }
        endAccessory={
          <ButtonIcon
            size={ButtonIconSizes.Lg}
            onPress={() => {
              // TODO: Implement search functionality
            }}
            iconName={IconName.Search}
            testID="search-button"
          />
        }
        style={styles.header}
      >
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {strings('trending.trending_tokens')}
        </Text>
      </HeaderBase>
      <View style={styles.controlBarWrapper}>
        <View style={styles.controlButtonOuterWrapper}>
          <TouchableOpacity
            testID="price-change-button"
            onPress={handlePriceChangePress}
            style={styles.controlButton}
            activeOpacity={0.2}
          >
            <View style={styles.controlButtonContent}>
              <Text style={styles.controlButtonText}>
                {strings('trending.price_change')}
              </Text>
              <Icon
                name={IconName.ArrowDown}
                color={IconColor.Alternative}
                size={IconSize.Xs}
              />
            </View>
          </TouchableOpacity>
          <View style={styles.controlButtonInnerWrapper}>
            <TouchableOpacity
              testID="all-networks-button"
              onPress={handleAllNetworksPress}
              style={styles.controlButtonRight}
              activeOpacity={0.2}
            >
              <View style={styles.controlButtonContent}>
                <Text style={styles.controlButtonText}>
                  {strings('trending.all_networks')}
                </Text>
                <Icon
                  name={IconName.ArrowDown}
                  color={IconColor.Alternative}
                  size={IconSize.Xs}
                />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              testID="24h-button"
              onPress={handle24hPress}
              style={styles.controlButtonRight}
              activeOpacity={0.2}
            >
              <View style={styles.controlButtonContent}>
                <Text style={styles.controlButtonText}>
                  {strings('trending.24h')}
                </Text>
                <Icon
                  name={IconName.ArrowDown}
                  color={IconColor.Alternative}
                  size={IconSize.Xs}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
