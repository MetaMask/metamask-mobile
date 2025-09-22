import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Image,
  Platform,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
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
import NavigationService from '../../../../../core/NavigationService';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';

import {
  usePerpsFirstTimeUser,
  usePerpsTrading,
  usePerpsNetworkManagement,
} from '../../hooks';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import createStyles from './PerpsTutorialCarousel.styles';
import Rive, { Alignment, Fit, LoopMode, RiveRef } from 'rive-react-native';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const PerpsOnboardingAnimationLight = require('../../animations/perps-onboarding-carousel-light.riv');
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const PerpsOnboardingAnimationDark = require('../../animations/perps-onboarding-carousel-dark.riv');
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
import Character from '../../../../../images/character_3x.png';
import { PerpsTutorialSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import { useSelector } from 'react-redux';

// Currently all Perps onboarding animations have the same name
const ANIMATION_NAME = 'Timeline 1';

export enum PERPS_RIVE_ARTBOARD_NAMES {
  SHORT_LONG = '01_Short_Long',
  LEVERAGE = '02_Leverage',
  LIQUIDATION = '03_Liquidation',
  CLOSE = '04_Close',
  READY = '05_Ready',
}

export interface TutorialScreen {
  id: string;
  title: string;
  description: string;
  subtitle?: string;
  content?: React.ReactNode;
  riveArtboardName?: PERPS_RIVE_ARTBOARD_NAMES;
}

const getTutorialScreens = (isEligible: boolean): TutorialScreen[] => {
  const defaultScreens = [
    {
      id: 'what_are_perps',
      title: strings('perps.tutorial.what_are_perps.title'),
      description: strings('perps.tutorial.what_are_perps.description'),
      content: (
        <Image
          source={Character}
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            width: '100%',
            flex: 1,
          }}
          resizeMode="contain"
          testID={PerpsTutorialSelectorsIDs.CHARACTER_IMAGE}
        />
      ),
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
      subtitle: strings('perps.tutorial.choose_leverage.subtitle'),
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
  ];

  const readyToTradeScreen = {
    id: 'ready_to_trade',
    title: strings('perps.tutorial.ready_to_trade.title'),
    description: strings('perps.tutorial.ready_to_trade.description'),
    riveArtboardName: PERPS_RIVE_ARTBOARD_NAMES.READY,
  };

  if (!isEligible) {
    return defaultScreens;
  }

  return [...defaultScreens, readyToTradeScreen];
};

const PerpsTutorialCarousel: React.FC = () => {
  const { markTutorialCompleted } = usePerpsFirstTimeUser();
  const { track } = usePerpsEventTracking();
  const { depositWithConfirmation } = usePerpsTrading();
  const { ensureArbitrumNetworkExists } = usePerpsNetworkManagement();
  const [currentTab, setCurrentTab] = useState(0);
  const safeAreaInsets = useSafeAreaInsets();
  const scrollableTabViewRef = useRef<
    ScrollableTabView & { goToPage: (pageNumber: number) => void }
  >(null);
  const hasTrackedViewed = useRef(false);
  const hasTrackedStarted = useRef(false);
  const tutorialStartTime = useRef(Date.now());
  const continueDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const { navigateToConfirmation } = useConfirmNavigation();

  const isEligible = useSelector(selectPerpsEligibility);

  const isDarkMode = useColorScheme() === 'dark';

  const tutorialScreens = useMemo(
    () => getTutorialScreens(isEligible),
    [isEligible],
  );

  const isLastScreen = useMemo(
    () => currentTab === tutorialScreens.length - 1,
    [currentTab, tutorialScreens.length],
  );

  const shouldShowSkipButton = useMemo(
    () => !isLastScreen || isEligible,
    [isLastScreen, isEligible],
  );

  const { styles } = useStyles(createStyles, {
    shouldShowSkipButton,
  });

  const PerpsOnboardingAnimation = useMemo(
    () =>
      isDarkMode ? PerpsOnboardingAnimationDark : PerpsOnboardingAnimationLight,
    [isDarkMode],
  );

  const riveRefs = useRef<Record<number, RiveRef | null>>({});

  const getRiveRef = useCallback(
    (screenIndex: number) => (ref: RiveRef | null) => {
      riveRefs.current[screenIndex] = ref;
    },
    [],
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

  // Cleanup timeouts on unmount
  useEffect(
    () => () => {
      if (continueDebounceRef.current) {
        clearTimeout(continueDebounceRef.current);
        continueDebounceRef.current = null;
      }
    },
    [],
  );

  // Play animation on current tab
  useEffect(() => {
    const currentRiveScreenRef = riveRefs.current[currentTab];
    if (currentRiveScreenRef && tutorialScreens[currentTab]?.riveArtboardName) {
      currentRiveScreenRef.play(ANIMATION_NAME, LoopMode.OneShot);
    }
  }, [currentTab, tutorialScreens]);

  const handleTabChange = useCallback(
    // The next tab to change to
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

  const navigateToMarketsList = useCallback(() => {
    NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKETS,
    });
  }, []);

  const handleContinue = useCallback(async () => {
    // Prevent double-tap on Android - if timeout exists, we're still debouncing
    if (continueDebounceRef.current) {
      return;
    }

    // Set debounce timeout
    continueDebounceRef.current = setTimeout(() => {
      continueDebounceRef.current = null;
    }, 100);

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

      // We need to enable Arbitrum for deposits to work
      // Arbitrum One is already added for all users as a default network
      // For devs on testnet, Arbitrum Sepolia will be added/enabled
      await ensureArbitrumNetworkExists();

      if (isEligible) {
        // Navigate immediately to confirmations screen for instant UI response
        // Note: When from deeplink, user will go through deposit flow
        // and should return to markets after completion
        navigateToConfirmation({ stack: Routes.PERPS.ROOT });

        // Initialize deposit in the background without blocking
        depositWithConfirmation().catch((error) => {
          console.error('Failed to initialize deposit:', error);
        });

        return;
      }

      navigateToMarketsList();
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
    track,
    currentTab,
    markTutorialCompleted,
    isEligible,
    navigateToConfirmation,
    depositWithConfirmation,
    tutorialScreens.length,
    ensureArbitrumNetworkExists,
    navigateToMarketsList,
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
    }

    // Mark tutorial as completed
    markTutorialCompleted();
    navigateToMarketsList();
  }, [
    isLastScreen,
    markTutorialCompleted,
    currentTab,
    track,
    navigateToMarketsList,
  ]);

  const renderTabBar = () => <View />;

  const buttonLabel = useMemo(() => {
    if (!isEligible && isLastScreen) {
      return strings('perps.tutorial.got_it');
    }

    if (isLastScreen) {
      return strings('perps.tutorial.add_funds');
    }

    return strings('perps.tutorial.continue');
  }, [isEligible, isLastScreen]);

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
      <View style={styles.carouselWrapper}>
        <ScrollableTabView
          ref={scrollableTabViewRef}
          renderTabBar={renderTabBar}
          onChangeTab={handleTabChange}
          initialPage={0}
          /**
           * Android experiences visual glitch where all layers of animations are stacked on top of each other when prerendering siblings.
           * iOS devices render the animations correctly and can handle prerendering siblings.
           */
          prerenderingSiblingsNumber={Platform.OS === 'ios' ? 1 : 0}
        >
          {tutorialScreens.map((screen, screenIndex) => (
            <View key={screen.id} style={styles.screenContainer}>
              {/* Header Section - Fixed height for text content */}
              <View style={styles.headerSection}>
                <Text
                  variant={TextVariant.HeadingMD}
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
              </View>

              {/* Content Section */}
              <View style={styles.contentSection}>
                {screen?.content && screen.content}
                {screen?.riveArtboardName && (
                  <Rive
                    key={screen.id}
                    ref={getRiveRef(screenIndex)}
                    artboardName={screen.riveArtboardName}
                    animationName={ANIMATION_NAME}
                    source={PerpsOnboardingAnimation}
                    fit={Fit.FitWidth}
                    alignment={Alignment.Center}
                    style={styles.animation}
                    autoplay={false}
                  />
                )}
              </View>
            </View>
          ))}
        </ScrollableTabView>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: safeAreaInsets.bottom }]}>
        <View style={styles.buttonRow}>
          <Button
            variant={ButtonVariants.Primary}
            label={buttonLabel}
            onPress={handleContinue}
            size={ButtonSize.Lg}
            testID={PerpsTutorialSelectorsIDs.CONTINUE_BUTTON}
            style={styles.continueButton}
          />
          <View style={styles.skipButton}>
            <TouchableOpacity
              onPress={handleSkip}
              disabled={isLastScreen && !isEligible}
              testID={PerpsTutorialSelectorsIDs.SKIP_BUTTON}
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
    </View>
  );
};

export default PerpsTutorialCarousel;
