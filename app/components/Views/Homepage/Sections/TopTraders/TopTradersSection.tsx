import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
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

interface TopTradersSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * TopTradersSection — Social leaderboard entry point on the homepage.
 *
 * Renders a tappable section header that navigates to the full
 * TopTradersView. The trader list, network filter, and follow actions
 * all live inside TopTradersView, not here.
 */
const TopTradersSection = forwardRef<
  SectionRefreshHandle,
  TopTradersSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const sectionViewRef = useRef<View>(null);
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
      <Box>
        <SectionHeader title={title} onPress={handleViewAll} />
      </Box>
    </View>
  );
});

export default TopTradersSection;
