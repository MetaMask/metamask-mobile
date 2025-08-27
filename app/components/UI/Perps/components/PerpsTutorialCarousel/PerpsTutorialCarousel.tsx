import {
  NavigationProp,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { PERFORMANCE_CONFIG } from '../../constants/perpsConfig';
import type { PerpsNavigationParamList } from '../../controllers/types';
import { usePerpsFirstTimeUser, usePerpsTrading } from '../../hooks';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import createStyles from './PerpsTutorialCarousel.styles';
import Rive, { Alignment, Fit } from 'rive-react-native';
import { isE2E } from '../../../../../util/test/utils';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs, @typescript-eslint/no-unused-vars
const PerpsOnboardingAnimation = require('../../animations/perps-onboarding-carousel-v4.riv');

export enum PERPS_RIVE_ARTBOARD_NAMES {
  INTRO = 'Intro_Perps_v03 2',
  SHORT_LONG = 'Short_Long_v03',
  LEVERAGE = 'Leverage_v03',
  LIQUIDATION = 'Liquidation_v03',
  CLOSE = 'Close_v03',
  READY = 'Ready_v03',
}

export interface TutorialScreen {
  id: string;
  title: string;
  description: string;
  subtitle?: string;
  riveArtboardName: PERPS_RIVE_ARTBOARD_NAMES;
}

const tutorialScreens: TutorialScreen[] = [
  {
    id: 'what_are_perps',
    title: strings('perps.tutorial.what_are_perps.title'),
    description: strings('perps.tutorial.what_are_perps.description'),
    subtitle: strings('perps.tutorial.what_are_perps.subtitle'),
    riveArtboardName: PERPS_RIVE_ARTBOARD_NAMES.INTRO,
  },
  {
    id: 'go_long_or_short',
    title: strings('perps.tutorial.go_long_or_short.title'),
    description: strings('perps.tutorial.go_long_or_short.description'),
    subtitle: strings('perps.tutorial.go_long_or_short.subtitle'),
    riveArtboardName: PERPS_RIVE_ARTBOARD_NAMES.SHORT_LONG,
  },
  {
    id: 'choose_leverage',
    title: strings('perps.tutorial.choose_leverage.title'),
    description: strings('perps.tutorial.choose_leverage.description'),
    riveArtboardName: PERPS_RIVE_ARTBOARD_NAMES.LEVERAGE,
  },
  {
    id: 'watch_liquidation',
    title: strings('perps.tutorial.watch_liquidation.title'),
    description: strings('perps.tutorial.watch_liquidation.description'),
    riveArtboardName: PERPS_RIVE_ARTBOARD_NAMES.LIQUIDATION,
  },
  {
    id: 'close_anytime',
    title: strings('perps.tutorial.close_anytime.title'),
    description: strings('perps.tutorial.close_anytime.description'),
    riveArtboardName: PERPS_RIVE_ARTBOARD_NAMES.CLOSE,
  },
  {
    id: 'ready_to_trade',
    title: strings('perps.tutorial.ready_to_trade.title'),
    description: strings('perps.tutorial.ready_to_trade.description'),
    riveArtboardName: PERPS_RIVE_ARTBOARD_NAMES.READY,
  },
];

interface PerpsTutorialRouteParams {
  isFromDeeplink?: boolean;
}

const PerpsTutorialCarousel: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<RouteProp<{ params: PerpsTutorialRouteParams }, 'params'>>();
  const isFromDeeplink = route.params?.isFromDeeplink || false;
  const { markTutorialCompleted } = usePerpsFirstTimeUser();
  const { track } = usePerpsEventTracking();
  const { depositWithConfirmation } = usePerpsTrading();
  const [currentTab, setCurrentTab] = useState(0);
  const safeAreaInsets = useSafeAreaInsets();
  const scrollableTabViewRef = useRef<
    ScrollableTabView & { goToPage: (pageNumber: number) => void }
  >(null);
  const hasTrackedViewed = useRef(false);
  const hasTrackedStarted = useRef(false);
  const tutorialStartTime = useRef(Date.now());

  const isLastScreen = useMemo(
    () => currentTab === tutorialScreens.length - 1,
    [currentTab],
  );

  // Track tutorial viewed on mount
  useEffect(() => {
    if (!hasTrackedViewed.current) {
      track(MetaMetricsEvents.PERPS_TUTORIAL_VIEWED, {
        [PerpsEventProperties.TIMESTAMP]: Date.now(),
        [PerpsEventProperties.SOURCE]:
          PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON,
      });
      hasTrackedViewed.current = true;
    }
  }, [track]);

  const handleTabChange = useCallback(
    (obj: { i: number }) => {
      setCurrentTab(obj.i);

      // Track tutorial started when user moves to second screen
      if (obj.i === 1 && !hasTrackedStarted.current) {
        track(MetaMetricsEvents.PERPS_TUTORIAL_STARTED, {
          [PerpsEventProperties.TIMESTAMP]: Date.now(),
          [PerpsEventProperties.SOURCE]:
            PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON,
        });
        hasTrackedStarted.current = true;
      }
    },
    [track],
  );

  const handleContinue = useCallback(() => {
    if (isLastScreen) {
      // Track tutorial completed
      const completionDuration = Date.now() - tutorialStartTime.current;
      track(MetaMetricsEvents.PERPS_TUTORIAL_COMPLETED, {
        [PerpsEventProperties.SOURCE]:
          PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON,
        [PerpsEventProperties.COMPLETION_DURATION_TUTORIAL]: completionDuration,
        [PerpsEventProperties.STEPS_VIEWED]: currentTab + 1,
        [PerpsEventProperties.VIEW_OCCURRENCES]: 1,
      });

      // Mark tutorial as completed
      markTutorialCompleted();

      // Navigate immediately to confirmations screen for instant UI response
      // Note: When from deeplink, user will go through deposit flow
      // and should return to markets after completion
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      });

      // Initialize deposit in the background without blocking
      depositWithConfirmation().catch((error) => {
        console.error('Failed to initialize deposit:', error);
      });
    } else {
      // Go to next screen using the ref
      const nextTab = Math.min(currentTab + 1, tutorialScreens.length - 1);
      scrollableTabViewRef.current?.goToPage(nextTab);

      // Track tutorial started on first continue
      if (currentTab === 0 && !hasTrackedStarted.current) {
        track(MetaMetricsEvents.PERPS_TUTORIAL_STARTED, {
          [PerpsEventProperties.TIMESTAMP]: Date.now(),
          [PerpsEventProperties.SOURCE]:
            PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON,
        });
        hasTrackedStarted.current = true;
      }
    }
  }, [
    isLastScreen,
    markTutorialCompleted,
    navigation,
    currentTab,
    track,
    depositWithConfirmation,
  ]);

  const handleSkip = useCallback(() => {
    if (isLastScreen) {
      // Track tutorial completed when skipping from last screen
      const completionDuration = Date.now() - tutorialStartTime.current;
      track(MetaMetricsEvents.PERPS_TUTORIAL_COMPLETED, {
        [PerpsEventProperties.SOURCE]:
          PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON,
        [PerpsEventProperties.COMPLETION_DURATION_TUTORIAL]: completionDuration,
        [PerpsEventProperties.STEPS_VIEWED]: currentTab + 1,
        [PerpsEventProperties.VIEW_OCCURRENCES]: 1,
      });

      // Mark tutorial as completed
      markTutorialCompleted();
    }

    // Navigate based on deeplink flag
    if (isFromDeeplink) {
      // Navigate to wallet home first
      navigation.navigate(Routes.WALLET.HOME);

      // The timeout is REQUIRED - React Navigation needs time to complete
      // the navigation before params can be set on the new screen
      setTimeout(() => {
        navigation.setParams({
          initialTab: 'perps',
          shouldSelectPerpsTab: true,
        });
      }, PERFORMANCE_CONFIG.NAVIGATION_PARAMS_DELAY_MS);
    } else {
      navigation.goBack();
    }
  }, [
    isLastScreen,
    markTutorialCompleted,
    navigation,
    currentTab,
    track,
    isFromDeeplink,
  ]);

  const renderTabBar = () => <View />;

  const buttonLabel = isLastScreen
    ? strings('perps.tutorial.add_funds')
    : strings('perps.tutorial.continue');

  const skipLabel = isLastScreen
    ? strings('perps.tutorial.got_it')
    : strings('perps.tutorial.skip');

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {tutorialScreens.map((screen, index) => (
          <View
            key={screen.id}
            style={[
              styles.progressDot,
              currentTab === index && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Tutorial Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.carouselWrapper}>
          <ScrollableTabView
            ref={scrollableTabViewRef}
            renderTabBar={renderTabBar}
            onChangeTab={handleTabChange}
            initialPage={0}
          >
            {tutorialScreens.map((screen) => (
              <View key={screen.id} style={styles.screenContainer}>
                <View style={styles.contentContainer}>
                  <Text
                    variant={TextVariant.HeadingLG}
                    color={TextColor.Default}
                    style={styles.title}
                  >
                    {screen.title}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                    style={styles.description}
                  >
                    {screen.description}
                  </Text>
                  {screen.subtitle && (
                    <Text
                      variant={TextVariant.BodyMD}
                      color={TextColor.Alternative}
                      style={styles.subtitle}
                    >
                      {screen.subtitle}
                    </Text>
                  )}
                  {/* Animation Container */}
                  <View style={styles.animationContainer}>
                    <Rive
                      artboardName={screen.riveArtboardName}
                      source={PerpsOnboardingAnimation}
                      fit={Fit.Cover}
                      alignment={Alignment.Center}
                      autoplay={!isE2E}
                    />
                  </View>
                </View>
              </View>
            ))}
          </ScrollableTabView>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: safeAreaInsets.bottom }]}>
        <View style={styles.buttonRow}>
          <Button
            variant={ButtonVariants.Primary}
            label={buttonLabel}
            onPress={handleContinue}
            size={ButtonSize.Lg}
            style={styles.continueButton}
            testID={
              isLastScreen
                ? 'perps-tutorial-add-funds-button'
                : 'perps-tutorial-continue-button'
            }
          />
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
            testID="perps-tutorial-skip-button"
          >
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Alternative}
            >
              {skipLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PerpsTutorialCarousel;
