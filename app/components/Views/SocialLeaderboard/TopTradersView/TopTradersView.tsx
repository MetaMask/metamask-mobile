import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text as RNText,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  BASE_DISPLAY_NAME,
  MAINNET_DISPLAY_NAME,
  SOLANA_DISPLAY_NAME,
} from '../../../../core/Engine/constants';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { fontStyles } from '../../../../styles/common';
import Logger from '../../../../util/Logger';
import { useTheme } from '../../../../util/theme';
import {
  TraderRow,
  TraderRowSkeleton,
} from '../../Homepage/Sections/TopTraders/components';
import { TRADER_ROW_HEIGHT } from '../../Homepage/Sections/TopTraders/components/TraderRow';
import { useTopTraders } from '../../Homepage/Sections/TopTraders/hooks';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';

type ChainFilter = 'all' | 'base' | 'solana' | 'ethereum';

const getChainFilters = (): { key: ChainFilter; label: string }[] => [
  {
    key: 'all',
    label: strings('social_leaderboard.top_traders_view.chain_filter.all'),
  },
  { key: 'base', label: BASE_DISPLAY_NAME },
  { key: 'solana', label: SOLANA_DISPLAY_NAME },
  { key: 'ethereum', label: MAINNET_DISPLAY_NAME },
];

const styles = StyleSheet.create({
  filterScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  pillText: {
    ...fontStyles.medium,
    fontSize: 16,
  },
});

interface ChainPillProps {
  filterKey: ChainFilter;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const ChainPill: React.FC<ChainPillProps> = ({
  filterKey,
  label,
  isSelected,
  onPress,
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={`chain-filter-${filterKey}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={[
        styles.pill,
        isSelected
          ? { backgroundColor: colors.icon.default }
          : { backgroundColor: colors.background.muted },
      ]}
    >
      <RNText
        style={[
          styles.pillText,
          { color: isSelected ? colors.primary.inverse : colors.text.default },
        ]}
      >
        {label}
      </RNText>
    </Pressable>
  );
};

const TopTradersView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);

  const [selectedChain, setSelectedChain] = useState<ChainFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Render enough skeleton rows to cover the visible list area. Add a couple of
  // extras so users can see the shimmer continue past the fold while scrolling.
  const skeletonKeys = useMemo(() => {
    const count = Math.ceil(windowHeight / TRADER_ROW_HEIGHT) + 2;
    return Array.from({ length: count }, (_, i) => `top-trader-skeleton-${i}`);
  }, [windowHeight]);

  const { traders, isLoading, refresh, toggleFollow } = useTopTraders({
    limit: 250,
    enabled: isEnabled,
  });

  useEffect(() => {
    if (!isEnabled) {
      navigation.goBack();
    }
  }, [isEnabled, navigation]);

  const filteredTraders = useMemo(() => {
    const filtered =
      selectedChain === 'all'
        ? traders
        : traders.filter((t) => (t.pnlPerChain[selectedChain] ?? 0) !== 0);

    // Re-number the displayed rank to reflect the trader's position within the
    // filtered slice, but keep `overallRank` pointing at the unfiltered rank
    // so podium decorations only apply to true top-3 traders.
    return filtered
      .slice(0, 50)
      .map((t, i) => ({ ...t, rank: i + 1, overallRank: t.rank }));
  }, [traders, selectedChain]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNotificationPreferencesPress = useCallback(() => {
    navigation.navigate(Routes.SOCIAL_LEADERBOARD.NOTIFICATION_PREFERENCES);
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const minDuration = new Promise<void>((resolve) =>
        setTimeout(resolve, 1000),
      );
      await Promise.all([refresh(), minDuration]);
    } catch (err) {
      Logger.error(err as Error, 'TopTradersView: pull-to-refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string, rank: number) => {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName,
        rank,
      });
    },
    [navigation],
  );

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TopTradersViewSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-2 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBack}
          testID={TopTradersViewSelectorsIDs.BACK_BUTTON}
        />
        <ButtonIcon
          iconName={IconName.Notification}
          size={ButtonIconSize.Md}
          onPress={handleNotificationPreferencesPress}
          testID={TopTradersViewSelectorsIDs.NOTIFICATION_BUTTON}
        />
      </Box>

      <Box twClassName="px-4 pt-2 pb-3">
        <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
          {strings('social_leaderboard.top_traders_view.title')}
        </Text>
      </Box>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // `flexGrow: 0` + `flexShrink: 0` pin the ScrollView's height to
        // its content so neither the FlatList nor the loading ScrollView
        // below can stretch or compress it.
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterRow}
      >
        {getChainFilters().map(({ key, label }) => (
          <ChainPill
            key={key}
            filterKey={key}
            label={label}
            isSelected={selectedChain === key}
            onPress={() => setSelectedChain(key)}
          />
        ))}
      </ScrollView>

      {isLoading ? (
        <ScrollView
          // `flex-1` matches FlatList's default behavior so the list area sits
          // directly under the filters and skeletons render top-aligned.
          style={tw.style('flex-1')}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-6')}
          refreshControl={
            <RefreshControl
              colors={[colors.primary.default]}
              tintColor={colors.icon.default}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {skeletonKeys.map((key) => (
            <TraderRowSkeleton key={key} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredTraders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TraderRow
              trader={item}
              onFollowPress={toggleFollow}
              onTraderPress={handleTraderPress}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-6')}
          testID={TopTradersViewSelectorsIDs.TRADER_LIST}
          initialNumToRender={15}
          windowSize={5}
          refreshControl={
            <RefreshControl
              colors={[colors.primary.default]}
              tintColor={colors.icon.default}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default TopTradersView;
