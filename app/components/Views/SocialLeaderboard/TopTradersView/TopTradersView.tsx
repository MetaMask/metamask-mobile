import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
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
import { strings } from '../../../../../locales/i18n';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';
import { TrendingTokenNetworkBottomSheet } from '../../../UI/Trending/components/TrendingTokensBottomSheet';
import {
  TraderRow,
  TraderRowSkeleton,
  NetworkFilterButton,
} from '../../Homepage/Sections/TopTraders/components';
import { useTopTraders } from '../../Homepage/Sections/TopTraders/hooks';
import type { NetworkFilterSelection } from '../../Homepage/Sections/TopTraders/types';
import type { CaipChainId } from '@metamask/utils';
import Routes from '../../../../constants/navigation/Routes';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';

const SKELETON_COUNT = 5;
const SKELETON_KEYS = Array.from(
  { length: SKELETON_COUNT },
  (_, i) => `top-trader-skeleton-${i}`,
);

/**
 * TopTradersView — Social leaderboard detail screen.
 *
 * Displays the full ranked list of top-performing traders with
 * network filtering and Follow / Following actions.
 */
const TopTradersView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);

  const { traders, isLoading, toggleFollow } = useTopTraders({
    enabled: isEnabled,
  });

  useEffect(() => {
    if (!isEnabled) {
      navigation.goBack();
    }
  }, [isEnabled, navigation]);

  const [showNetworkBottomSheet, setShowNetworkBottomSheet] = useState(false);
  const [selectedNetwork, setSelectedNetwork] =
    useState<NetworkFilterSelection>(null);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSearchPress = useCallback(() => {
    // Search UI will be wired when the leaderboard data layer ships.
  }, []);

  const handleNetworkPress = useCallback(() => {
    setShowNetworkBottomSheet(true);
  }, []);

  const handleNetworkSelect = useCallback((chainIds: CaipChainId[] | null) => {
    setSelectedNetwork(chainIds ? chainIds[0] : null);
  }, []);

  const handleNetworkBottomSheetClose = useCallback(() => {
    setShowNetworkBottomSheet(false);
  }, []);

  const handleTraderPress = useCallback(
    (traderId: string, traderName: string) => {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName,
      });
    },
    [navigation],
  );

  const selectedNetworkCaip = selectedNetwork
    ? ([selectedNetwork] as CaipChainId[])
    : null;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TopTradersViewSelectorsIDs.CONTAINER}
    >
      {/* Header row */}
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
          iconName={IconName.Search}
          size={ButtonIconSize.Md}
          onPress={handleSearchPress}
          testID={TopTradersViewSelectorsIDs.SEARCH_BUTTON}
        />
      </Box>

      {/* Title */}
      <Box twClassName="px-4 pt-2 pb-3">
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Medium}
        >
          {strings('social_leaderboard.top_traders_view.title')}
        </Text>
      </Box>

      {/* Network filter */}
      <Box twClassName="px-4 pb-3">
        <NetworkFilterButton
          selectedNetwork={selectedNetwork}
          onPress={handleNetworkPress}
          testID="top-traders-view-network-filter"
        />
      </Box>

      {/* Trader list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-6')}
        testID="top-traders-view-list"
      >
        {isLoading
          ? SKELETON_KEYS.map((key) => <TraderRowSkeleton key={key} />)
          : traders.map((trader) => (
              <TraderRow
                key={trader.id}
                trader={trader}
                onFollowPress={toggleFollow}
                onTraderPress={handleTraderPress}
              />
            ))}
      </ScrollView>

      {/* Network filter bottom sheet */}
      <TrendingTokenNetworkBottomSheet
        isVisible={showNetworkBottomSheet}
        onClose={handleNetworkBottomSheetClose}
        onNetworkSelect={handleNetworkSelect}
        selectedNetwork={selectedNetworkCaip}
        networks={[]}
      />
    </SafeAreaView>
  );
};

export default TopTradersView;
