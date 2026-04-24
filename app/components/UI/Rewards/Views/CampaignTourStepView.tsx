import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TouchableOpacity, View } from 'react-native';
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
  FontWeight,
  Text,
  TextColor,
  TextVariant,
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

  const nextButtonLabel = useMemo(
    () =>
      isLastStep
        ? strings('rewards.onboarding.step_finish')
        : strings('rewards.onboarding.step_confirm'),
    [isLastStep],
  );

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
      {/* Progress Dots */}
      <Box twClassName="flex-row justify-center items-center py-6 px-4">
        <ProgressIndicator
          totalSteps={tour.length}
          currentStep={currentTab + 1}
          variant="bars"
        />
      </Box>

      {/* Tutorial Content */}
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

      {/* Footer */}
      <Box twClassName="px-4" style={{ paddingBottom: safeAreaInsets.bottom }}>
        <Box twClassName="mb-4 gap-4">
          {showNext && (
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleNext}
              twClassName="w-full"
              testID={CAMPAIGN_TOUR_STEP_TEST_IDS.NEXT_BUTTON}
            >
              {nextButtonLabel}
            </Button>
          )}
          <Box
            twClassName="self-center px-4"
            style={tw.style(!showSkip && 'opacity-0')}
          >
            <TouchableOpacity
              onPress={navigateToDetails}
              disabled={!showSkip}
              testID={CAMPAIGN_TOUR_STEP_TEST_IDS.SKIP_BUTTON}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings('rewards.onboarding.step_skip')}
              </Text>
            </TouchableOpacity>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CampaignTourStepView;
