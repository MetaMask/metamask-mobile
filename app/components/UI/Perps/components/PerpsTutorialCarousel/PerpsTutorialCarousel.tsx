import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image, View, useColorScheme, ScrollView } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
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
import { EXTERNAL_LINK_TYPE } from '../../../../../constants/browser';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';

import { usePerpsFirstTimeUser } from '../../hooks';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsConnectionManager } from '../../services/PerpsConnectionManager';
import createStyles from './PerpsTutorialCarousel.styles';
import Rive, { Alignment, Fit } from 'rive-react-native';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const PerpsOnboardingAnimationLight = require('../../animations/perps-onboarding-carousel-light.riv');
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const PerpsOnboardingAnimationDark = require('../../animations/perps-onboarding-carousel-dark.riv');
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
import Character from '../../../../../images/character_3x.png';
import { PerpsTutorialSelectorsIDs } from '../../Perps.testIds';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import { useSelector } from 'react-redux';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

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
  footerText?: string;
  content?: React.ReactNode;
  riveArtboardName?: PERPS_RIVE_ARTBOARD_NAMES;
}

const getTutorialScreens = (isEligible: boolean): TutorialScreen[] => {
  const defaultScreens = [
    {
      id: 'what_are_perps',
      title: strings('perps.tutorial.what_are_perps.title'),
      description: strings('perps.tutorial.what_are_perps.description'),
      subtitle: strings('perps.tutorial.what_are_perps.subtitle'),
      content: (
        <Image
          source={Character}
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            width: '100%',
            height: 350,
            marginTop: 'auto',
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
  const [currentTab, setCurrentTab] = useState(0);
  const safeAreaInsets = useSafeAreaInsets();

  const scrollableTabViewRef = useRef<
    typeof ScrollableTabView & { goToPage: (pageNumber: number) => void }
  >(null);
  const hasTrackedViewed = useRef(false);
  const hasTrackedStarted = useRef(false);
  const tutorialStartTime = useRef(Date.now());
  const continueDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const previousTabRef = useRef(0);
  const isProgrammaticNavigationRef = useRef(false);

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

  const shouldShowSkipButton = useMemo(() => !isLastScreen, [isLastScreen]);

  const { styles } = useStyles(createStyles, {
    shouldShowSkipButton,
  });

  const PerpsOnboardingAnimation = useMemo(
    () =>
      isDarkMode ? PerpsOnboardingAnimationDark : PerpsOnboardingAnimationLight,
    [isDarkMode],
  );

  // Track tutorial screen viewed on mount
  useEffect(() => {
    if (!hasTrackedViewed.current) {
      track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
        [PerpsEventProperties.SCREEN_TYPE]:
          PerpsEventValues.SCREEN_TYPE.TUTORIAL,
        [PerpsEventProperties.SOURCE]:
          PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON,
      });
      hasTrackedViewed.current = true;
    }
  }, [track]);

  // Initialize connection in background while user views tutorial
  useEffect(() => {
    PerpsConnectionManager.connect().catch((error) => {
      DevLogger.log(
        'Background connection initialization during tutorial:',
        error,
      );
    });
  }, []);

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

  const handleTabChange = useCallback(
    // The next tab to change to
    (obj: { i: number }) => {
      const newTab = obj.i;
      const previousTab = previousTabRef.current;

      // Skip tracking if this is programmatic navigation (from button click)
      if (isProgrammaticNavigationRef.current) {
        isProgrammaticNavigationRef.current = false; // Reset flag
        previousTabRef.current = newTab;
        setCurrentTab(newTab);
        return; // Don't track programmatic navigation
      }

      // Only track if tab actually changed (user swipe)
      if (newTab !== previousTab) {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PerpsEventProperties.INTERACTION_TYPE]:
            PerpsEventValues.INTERACTION_TYPE.TUTORIAL_NAVIGATION,
          [PerpsEventProperties.PREVIOUS_SCREEN]:
            tutorialScreens[previousTab]?.id || 'unknown',
          [PerpsEventProperties.CURRENT_SCREEN]:
            tutorialScreens[newTab]?.id || 'unknown',
          [PerpsEventProperties.SCREEN_POSITION]: newTab + 1,
          [PerpsEventProperties.TOTAL_SCREENS]: tutorialScreens.length,
          [PerpsEventProperties.NAVIGATION_METHOD]:
            PerpsEventValues.NAVIGATION_METHOD.SWIPE,
        });

        previousTabRef.current = newTab;
      }

      setCurrentTab(newTab);

      // Track tutorial started when user moves to second screen
      if (newTab === 1 && !hasTrackedStarted.current) {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PerpsEventProperties.INTERACTION_TYPE]:
            PerpsEventValues.INTERACTION_TYPE.TUTORIAL_STARTED,
          [PerpsEventProperties.SOURCE]:
            PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON,
        });
        hasTrackedStarted.current = true;
      }
    },
    [track, tutorialScreens],
  );

  const navigateToMarketsList = useCallback(() => {
    NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
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
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.TUTORIAL_COMPLETED,
        [PerpsEventProperties.SOURCE]:
          PerpsEventValues.SOURCE.MAIN_ACTION_BUTTON,
        [PerpsEventProperties.COMPLETION_DURATION_TUTORIAL]: completionDuration,
        [PerpsEventProperties.STEPS_VIEWED]: currentTab + 1,
        [PerpsEventProperties.VIEW_OCCURRENCES]: 1,
      });

      // Mark tutorial as completed
      markTutorialCompleted();
      // Navigate all users to perps home screen for a more natural experience
      navigateToMarketsList();
    } else {
      // Go to next screen using the ref
      const nextTab = Math.min(currentTab + 1, tutorialScreens.length - 1);

      // Track carousel navigation via continue button (immediate, no debounce needed for button clicks)
      if (nextTab !== currentTab) {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PerpsEventProperties.INTERACTION_TYPE]:
            PerpsEventValues.INTERACTION_TYPE.TUTORIAL_NAVIGATION,
          [PerpsEventProperties.PREVIOUS_SCREEN]:
            tutorialScreens[currentTab]?.id || 'unknown',
          [PerpsEventProperties.CURRENT_SCREEN]:
            tutorialScreens[nextTab]?.id || 'unknown',
          [PerpsEventProperties.SCREEN_POSITION]: nextTab + 1,
          [PerpsEventProperties.TOTAL_SCREENS]: tutorialScreens.length,
          [PerpsEventProperties.NAVIGATION_METHOD]:
            PerpsEventValues.NAVIGATION_METHOD.CONTINUE_BUTTON,
        });
      }

      // Set flag to indicate this is programmatic navigation
      isProgrammaticNavigationRef.current = true;
      scrollableTabViewRef.current?.goToPage(nextTab);

      // Track tutorial started on first continue
      if (currentTab === 0 && !hasTrackedStarted.current) {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PerpsEventProperties.INTERACTION_TYPE]:
            PerpsEventValues.INTERACTION_TYPE.TUTORIAL_STARTED,
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
    tutorialScreens,
    markTutorialCompleted,
    navigateToMarketsList,
  ]);

  const handleSkip = useCallback(() => {
    if (isLastScreen) {
      // Track tutorial completed when skipping from last screen
      const completionDuration = Date.now() - tutorialStartTime.current;
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.TUTORIAL_COMPLETED,
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

  const handleLearnMore = useCallback(() => {
    NavigationService.navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: 'https://support.metamask.io/manage-crypto/trade/perps',
        linkType: EXTERNAL_LINK_TYPE,
        timestamp: Date.now(),
        fromPerps: true,
      },
    });
  }, []);

  const renderTabBar = () => <View />;

  const buttonLabel = useMemo(() => {
    if (isLastScreen) {
      return strings('perps.tutorial.lets_go');
    }

    return strings('perps.tutorial.continue');
  }, [isLastScreen]);

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
        >
          {tutorialScreens.map((screen) => (
            <View key={screen.id} style={styles.fullScreenContainer}>
              <ScrollView
                style={styles.scrollableContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.screenContainer}>
                  {/* Header Section - Now flexible height */}
                  <View>
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
                  </View>

                  {/* Content Section */}
                  {screen?.content && (
                    <View style={styles.contentSection}>{screen.content}</View>
                  )}

                  {screen?.riveArtboardName && (
                    <View style={styles.animationContainer}>
                      <Rive
                        key={screen.id}
                        style={styles.animation}
                        artboardName={screen.riveArtboardName}
                        source={PerpsOnboardingAnimation}
                        fit={Fit.FitWidth}
                        alignment={Alignment.Center}
                        autoplay
                      />
                    </View>
                  )}
                </View>
                {screen.footerText && (
                  <View style={styles.footerTextContainer}>
                    <Text
                      variant={TextVariant.BodySM}
                      color={TextColor.Alternative}
                      style={styles.footerText}
                    >
                      {screen.footerText}
                    </Text>
                  </View>
                )}
              </ScrollView>
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
          {isLastScreen && (
            <Button
              variant={ButtonVariants.Secondary}
              label={strings('perps.tutorial.learn_more')}
              onPress={handleLearnMore}
              size={ButtonSize.Lg}
              style={styles.continueButton}
              testID={PerpsTutorialSelectorsIDs.LEARN_MORE_BUTTON}
            />
          )}
          {!isLastScreen && (
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
                  {strings('perps.tutorial.skip')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default PerpsTutorialCarousel;
