import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import { SectionRefreshHandle } from '../../types';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';

interface TopTradersSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * TopTradersSection — Social leaderboard section on the homepage.
 *
 * Shows a horizontal carousel of top-performing traders.
 * Currently renders an empty placeholder carousel while the data layer is being built.
 */
const TopTradersSection = forwardRef<
  SectionRefreshHandle,
  TopTradersSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const sectionViewRef = useRef<View>(null);
  const tw = useTailwind();
  const navigation = useNavigation();
  const isEnabled = useSelector(selectSocialLeaderboardEnabled);
  const title = strings('homepage.sections.top_traders');

  useImperativeHandle(
    ref,
    () => ({
      refresh: async () => undefined,
    }),
    [],
  );

  const { onLayout } = useHomeViewedEvent({
    sectionRef: sectionViewRef,
    isLoading: false,
    sectionName: HomeSectionNames.TOP_TRADERS,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty: true,
    itemCount: 0,
  });

  useSectionPerformance({
    sectionId: HomeSectionNames.TOP_TRADERS,
    contentReady: isEnabled,
    isEmpty: true,
    enabled: isEnabled,
  });

  const handleViewAll = useCallback(() => {
    navigation.navigate(Routes.SOCIAL_LEADERBOARD.VIEW as never);
  }, [navigation]);

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 gap-2.5')}
          testID="homepage-top-traders-carousel"
        />
      </Box>
    </View>
  );
});

export default TopTradersSection;
