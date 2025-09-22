import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Image,
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
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import { useSelector } from 'react-redux';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const PerpsOnboardingAnimationLight = require('../../animations/perps-onboarding-carousel-light.riv');
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const PerpsOnboardingAnimationDark = require('../../animations/perps-onboarding-carousel-dark.riv');
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
// import Character from '../../images/perps_onboarding_character.svg';
import Character from '../../images/perps_onboarding_character.png';
import { PerpsTutorialSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { useConfirmNavigation } from '../../../../Views/confirmations/hooks/useConfirmNavigation';

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

// TODO: Fix positioning being inconsistent between tabs
// TODO: Test on small and large devices
const getTutorialScreens = (isEligible: boolean): TutorialScreen[] => {
  const { height: DEVICE_HEIGHT } = Dimensions.get('window');

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
            height: '100%',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: DEVICE_HEIGHT > 820 ? 80 : 10, // Extra margin larger screens so the image is lower
            marginBottom: 20,
          }}
          resizeMode="contain"
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

  // Refs for each Rive animation to control playback
  const riveRefs = useRef<{ [key: string]: React.RefObject<RiveRef> }>({});

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

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (continueDebounceRef.current) {
        clearTimeout(continueDebounceRef.current);
        continueDebounceRef.current = null;
      }
    },
    [],
  );

  // Helper function to get or create a ref for a specific screen
  const getRiveRef = useCallback((screenId: string) => {
    riveRefs.current[screenId] ??= React.createRef<RiveRef>();
    return riveRefs.current[screenId];
  }, []);

  // Control Rive animation playback based on current tab visibility
  useEffect(() => {
    tutorialScreens.forEach((screen, index) => {
      const riveRef = riveRefs.current[screen.id];
      if (!riveRef?.current) return;

      try {
        if (index === currentTab) {
          // Play animation for current visible tab
          riveRef.current.play();
        } else {
          // Stop animation for non-visible tabs to prevent them from playing
          riveRef.current.stop();
        }
      } catch (error) {
        console.warn(
          `Error controlling Rive animation for ${screen.id}:`,
          error,
        );
      }
    });
  }, [currentTab, tutorialScreens]);

  // Play the first tab's animation on mount
  useEffect(() => {
    const firstScreen = tutorialScreens[0];
    if (firstScreen?.riveArtboardName) {
      const riveRef = riveRefs.current[firstScreen.id];
      if (riveRef?.current) {
        try {
          riveRef.current.play();
        } catch (error) {
          console.warn(
            `Error playing initial Rive animation for ${firstScreen.id}:`,
            error,
          );
        }
      }
    }
  }, [tutorialScreens]);

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

      // We need to enable Arbitrum for desposits to work
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
      {/* <ScrollView contentContainerStyle={styles.scrollContent}> */}
      <View style={styles.carouselWrapper}>
        <ScrollableTabView
          ref={scrollableTabViewRef}
          renderTabBar={renderTabBar}
          onChangeTab={handleTabChange}
          initialPage={0}
          prerenderingSiblingsNumber={1}
        >
          {tutorialScreens.map((screen) => (
            <View key={screen.id} style={styles.screenContainer}>
              {/* Text content wrapper */}
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

              {/* Image/Animation content that fills remaining space */}
              {screen?.content && screen.content}

              {/* Animation Container */}
              {screen?.riveArtboardName && (
                <View style={styles.animationContainer}>
                  <Rive
                    ref={getRiveRef(screen.id)}
                    artboardName={screen.riveArtboardName}
                    source={PerpsOnboardingAnimation}
                    fit={Fit.Cover}
                    alignment={Alignment.Center}
                    autoplay={false}
                  />
                </View>
              )}
            </View>
          ))}
        </ScrollableTabView>
      </View>
      {/* </ScrollView> */}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: safeAreaInsets.bottom }]}>
        <View style={styles.buttonRow}>
          {isLastScreen && (
            <Text variant={TextVariant.BodySM} style={styles.fundsInfoText}>
              {strings('perps.tutorial.ready_to_trade.fund_text_helper')}
            </Text>
          )}
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
