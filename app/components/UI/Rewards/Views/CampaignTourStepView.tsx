import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  StackActions,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
} from '@metamask/design-system-react-native';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
import { selectCampaignById } from '../../../../reducers/rewards/selectors';
import Routes from '../../../../constants/navigation/Routes';
import ProgressIndicator from '../components/Onboarding/ProgressIndicator';
import CampaignTourStep, {
  CAMPAIGN_TOUR_STEP_TEST_IDS,
} from '../components/Campaigns/tour/CampaignTourStep';
import { strings } from '../../../../../locales/i18n';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CampaignTourStepRouteParams = {
  RewardsCampaignTourStep: {
    campaignId: string;
  };
};

const CampaignTourStepView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<
      RouteProp<CampaignTourStepRouteParams, 'RewardsCampaignTourStep'>
    >();
  const { campaignId } = route.params;
  const safeAreaInsets = useSafeAreaInsets();

  const selectCampaign = useMemo(
    () => selectCampaignById(campaignId),
    [campaignId],
  );
  const campaign = useSelector(selectCampaign);

  const tour = campaign?.details?.howItWorks?.tour;
  const [currentTab, setCurrentTab] = useState(0);
  const scrollableTabViewRef = useRef<
    typeof ScrollableTabView & { goToPage: (page: number) => void }
  >(null);

  const navigateToDetails = useCallback(() => {
    navigation.dispatch(
      StackActions.replace(Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW, {
        campaignId,
      }),
    );
  }, [navigation, campaignId]);

  const currentStep = tour?.[currentTab];
  const isLastStep = tour ? currentTab === tour.length - 1 : false;
  const showNext = currentStep?.actions?.next === true;
  const showSkip = currentStep?.actions?.skip === true;

  const handleTabChange = useCallback((obj: { i: number }) => {
    setCurrentTab(obj.i);
  }, []);

  const handleNext = useCallback(() => {
    if (!tour) return;
    if (isLastStep) {
      navigateToDetails();
    } else {
      scrollableTabViewRef.current?.goToPage(currentTab + 1);
    }
  }, [tour, isLastStep, currentTab, navigateToDetails]);

  const renderTabBar = useCallback(() => <View />, []);

  useEffect(() => {
    if (!tour?.length) {
      navigateToDetails();
    }
  }, [tour, navigateToDetails]);

  if (!tour?.length) {
    return null;
  }

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={{ paddingTop: safeAreaInsets.top }}
    >
      <Box twClassName="items-center pt-4 pb-2">
        <ProgressIndicator
          totalSteps={tour.length}
          currentStep={currentTab + 1}
          variant="bars"
        />
      </Box>

      <Box twClassName="flex-1">
        <ScrollableTabView
          ref={scrollableTabViewRef}
          renderTabBar={renderTabBar}
          onChangeTab={handleTabChange}
          initialPage={0}
        >
          {tour.map((step, index) => (
            <Box key={index} twClassName="flex-1">
              <CampaignTourStep step={step} />
            </Box>
          ))}
        </ScrollableTabView>
      </Box>

      <Box
        twClassName="px-4 gap-2 pb-2"
        style={{ paddingBottom: safeAreaInsets.bottom }}
      >
        {showNext && (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleNext}
            twClassName="w-full"
            testID={CAMPAIGN_TOUR_STEP_TEST_IDS.NEXT_BUTTON}
          >
            {strings('rewards.onboarding.step_confirm')}
          </Button>
        )}
        {showSkip && (
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Lg}
            onPress={navigateToDetails}
            twClassName="w-full bg-gray-500 border-gray-500"
            testID={CAMPAIGN_TOUR_STEP_TEST_IDS.SKIP_BUTTON}
          >
            <Text twClassName="text-text-default">
              {strings('rewards.onboarding.step_skip')}
            </Text>
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default CampaignTourStepView;
