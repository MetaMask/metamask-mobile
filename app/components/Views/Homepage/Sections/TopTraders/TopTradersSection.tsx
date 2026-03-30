import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import { SectionRefreshHandle } from '../../types';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import {
  TrendingTokenNetworkBottomSheet,
  NetworkOption,
} from '../../../../UI/Trending/components/TrendingTokensBottomSheet';
import {
  TraderRow,
  TraderRowSkeleton,
  NetworkFilterButton,
} from './components';
import { useTopTraders } from './hooks';
import type { NetworkFilterSelection } from './types';
import type { CaipChainId } from '@metamask/utils';

interface TopTradersSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

const SKELETON_COUNT = 3;
const SKELETON_KEYS = Array.from(
  { length: SKELETON_COUNT },
  (_, i) => `top-trader-skeleton-${i}`,
);

/**
 * TopTradersSection — Social leaderboard section on the homepage.
 *
 * Shows a vertical list of top-performing traders with rank, avatar,
 * username, performance stats, and a Follow / Following toggle.
 * Includes an "All networks" filter dropdown with a bottom sheet picker.
 */
const TopTradersSection = forwardRef<
  SectionRefreshHandle,
  TopTradersSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const sectionViewRef = useRef<View>(null);
  const navigation = useNavigation();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);
  const title = strings('homepage.sections.top_traders');

  const { traders, isLoading, refresh, toggleFollow } = useTopTraders();

  const [showNetworkBottomSheet, setShowNetworkBottomSheet] = useState(false);
  const [selectedNetwork, setSelectedNetwork] =
    useState<NetworkFilterSelection>(null);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const { onLayout } = useHomeViewedEvent({
    sectionRef: sectionViewRef,
    isLoading,
    sectionName: HomeSectionNames.TOP_TRADERS,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty: traders.length === 0,
    itemCount: traders.length,
  });

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.SOCIAL_LEADERBOARD.VIEW as never);
  }, [navigation]);

  const handleNetworkPress = useCallback(() => {
    setShowNetworkBottomSheet(true);
  }, []);

  const handleNetworkSelect = useCallback((chainIds: CaipChainId[] | null) => {
    setSelectedNetwork(chainIds ? chainIds[0] : null);
  }, []);

  const handleNetworkBottomSheetClose = useCallback(() => {
    setShowNetworkBottomSheet(false);
  }, []);

  const selectedNetworkCaip = selectedNetwork
    ? ([selectedNetwork] as CaipChainId[])
    : null;

  if (!isEnabled) {
    return null;
  }

  return (
    <View
      ref={sectionViewRef}
      onLayout={onLayout}
      testID="homepage-top-traders-section-root"
    >
      <Box gap={3}>
        <SectionHeader title={title} onPress={handleViewAll} />

        {/* Network filter button */}
        <Box twClassName="px-4">
          <NetworkFilterButton
            selectedNetwork={selectedNetwork}
            onPress={handleNetworkPress}
            testID="top-traders-network-filter"
          />
        </Box>

        {/* Trader list */}
        <Box>
          {isLoading
            ? SKELETON_KEYS.map((key) => <TraderRowSkeleton key={key} />)
            : traders.map((trader) => (
                <TraderRow
                  key={trader.id}
                  trader={trader}
                  onFollowPress={toggleFollow}
                />
              ))}
        </Box>
      </Box>

      {/* Network filter bottom sheet */}
      <TrendingTokenNetworkBottomSheet
        isVisible={showNetworkBottomSheet}
        onClose={handleNetworkBottomSheetClose}
        onNetworkSelect={handleNetworkSelect}
        selectedNetwork={selectedNetworkCaip}
        networks={[]}
      />
    </View>
  );
});

export default TopTradersSection;
