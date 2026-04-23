import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as RNText,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';
import {
  TraderRow,
  TraderRowSkeleton,
} from '../../Homepage/Sections/TopTraders/components';
import { useTopTraders } from '../../Homepage/Sections/TopTraders/hooks';
import Routes from '../../../../constants/navigation/Routes';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import {
  BASE_DISPLAY_NAME,
  MAINNET_DISPLAY_NAME,
  SOLANA_DISPLAY_NAME,
} from '../../../../core/Engine/constants';

const SKELETON_COUNT = 5;
const SKELETON_KEYS = Array.from(
  { length: SKELETON_COUNT },
  (_, i) => `top-trader-skeleton-${i}`,
);

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
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  pillBorder: {
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: FontWeight.Medium,
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
          : [styles.pillBorder, { borderColor: colors.border.muted }],
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
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);

  const [selectedChain, setSelectedChain] = useState<ChainFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

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

    return filtered.slice(0, 50).map((t, i) => ({ ...t, rank: i + 1 }));
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
    (traderId: string, traderName: string) => {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName,
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

      <Box twClassName="px-4 pt-2 pb-3 mb-2">
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Medium}
        >
          {strings('social_leaderboard.top_traders_view.title')}
        </Text>
      </Box>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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
          {SKELETON_KEYS.map((key) => (
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
