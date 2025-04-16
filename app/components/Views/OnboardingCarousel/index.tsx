import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import type { ThemeColors } from '@metamask/design-tokens';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { ITrackingEvent } from '../../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import {
  baseStyles,
  onboardingCarouselColors,
  colors as constColors,
} from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { getOnboardingCarouselNavbarOptions } from '../../UI/Navbar';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
import Device from '../../../util/device';
import { connect } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { WELCOME_SCREEN_CAROUSEL_TITLE_ID } from '../../../../wdio/screen-objects/testIDs/Screens/WelcomeScreen.testIds';
import { OnboardingCarouselSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingCarousel.selectors';
import generateTestId from '../../../../wdio/utils/generateTestId';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { isTest } from '../../../util/test/utils';
import StorageWrapper from '../../../store/storage-wrapper';
import { Dispatch } from 'redux';
import {
  saveOnboardingEvent as SaveEvent,
  OnboardingActionTypes,
} from '../../../actions/onboarding';
import navigateTermsOfUse from '../../../util/termsOfUse/termsOfUse';
import { USE_TERMS } from '../../../constants/storage';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

const IMAGE_RATIO = 250 / 200;
const DEVICE_WIDTH = Dimensions.get('window').width;
const DEVICE_HEIGHT = Dimensions.get('window').height;
const ANDROID_PADDING = DEVICE_HEIGHT > 800 ? 80 : 150;
const IOS_PADDING = Device.isIphoneX() ? 80 : Device.isIphone5S() ? 160 : 150;
const IMG_PADDING = Device.isAndroid() ? ANDROID_PADDING : IOS_PADDING;

const carouselSize = {
  width: DEVICE_WIDTH - IMG_PADDING,
  height: (DEVICE_WIDTH - IMG_PADDING) * IMAGE_RATIO,
};
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 1,
    },
    wrapper: {
      paddingTop: 30,
      paddingBottom: 24,
      flex: 1,
      marginTop: 100,
    },
    title: {
      fontSize: 40,
      marginBottom: 28,
      justifyContent: 'center',
      textAlign: 'center',
      paddingHorizontal: 60,
    },
    subtitle: {
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    ctas: {
      paddingHorizontal: 16,
      paddingBottom: Device.isIphoneX() ? 40 : 20,
      flexDirection: 'column',
    },
    carouselImage: {},
    carouselImage1: {
      ...carouselSize,
    },
    carouselImage2: {
      ...carouselSize,
    },
    carouselImage3: {
      ...carouselSize,
    },
    carouselImageWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bar: {
      width: 10,
      height: 2,
      backgroundColor: colors.icon.default,
      opacity: 0.4,
      marginHorizontal: 2,
    },
    solidBar: {
      opacity: 1,
    },
    progressContainer: {
      flexDirection: 'row',
      alignSelf: 'center',
      marginTop: 47,
      padding: 10,
    },
    tab: {
      marginHorizontal: 30,
    },
    metricsData: {
      textAlign: 'center',
    },
    gettingStartedButton: {
      borderRadius: 12,
      color: constColors.whiteTransparent,
      backgroundColor: constColors.btnBlack,
    },
  });

const onboarding_carousel_1 = require('../../../images/onboarding-carousel-1.png'); // eslint-disable-line
const onboarding_carousel_2 = require('../../../images/onboarding-carousel-2.png'); // eslint-disable-line
const onboarding_carousel_3 = require('../../../images/onboarding-carousel-3.png'); // eslint-disable-line

const carousel_images = [
  onboarding_carousel_1,
  onboarding_carousel_2,
  onboarding_carousel_3,
];

interface OnboardingCarouselProps {
  navigation: NavigationProp<ParamListBase>;
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}
/**
 * View that is displayed to first time (new) users
 */
export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({
  navigation,
  saveOnboardingEvent,
}) => {
  const [currentTab, setCurrentTab] = useState(1);
  const [appStartTime, setAppStartTime] = useState<string | undefined>(
    undefined,
  );
  const themeContext = useContext(ThemeContext);
  const colors = themeContext.colors || mockTheme.colors;
  const styles = createStyles(colors);

  const track = useCallback(
    (event: ITrackingEvent) => {
      trackOnboarding(event, saveOnboardingEvent);
    },
    [saveOnboardingEvent],
  );

  const navigateToOnboarding = () => {
    navigation.navigate('Onboarding');
    track(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ONBOARDING_STARTED,
      ).build(),
    );
  };

  const termsOfUse = async () => {
    if (navigation) {
      await navigateTermsOfUse(navigation.navigate, navigateToOnboarding);
    }
  };

  const onPressGetStarted = async () => {
    StorageWrapper.removeItem(USE_TERMS);
    await termsOfUse();
  };

  const renderTabBar = () => <View />;

  const onChangeTab = (obj: { i: number }) => {
    setCurrentTab(obj.i + 1);
    track(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ONBOARDING_WELCOME_SCREEN_ENGAGEMENT,
      )
        .addProperties({
          message_title: strings(`onboarding_carousel.title${[obj.i + 1]}`, {
            locale: 'en',
          }),
        })
        .build(),
    );
  };

  const getCurrentTabKey = useCallback(
    () => (currentTab === 1 ? 'one' : currentTab === 2 ? 'two' : 'three'),
    [currentTab],
  );

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getOnboardingCarouselNavbarOptions(
        colors,
        onboardingCarouselColors[getCurrentTabKey()].background,
      ),
    );
  }, [navigation, colors, getCurrentTabKey]);

  const initialize = useCallback(async () => {
    updateNavBar();
    track(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ONBOARDING_WELCOME_MESSAGE_VIEWED,
      ).build(),
    );
    const newAppStartTime = await StorageWrapper.getItem('appStartTime');
    setAppStartTime(newAppStartTime);
  }, [updateNavBar, track]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    updateNavBar();
  }, [colors, updateNavBar]);

  const getBackgroundColor = () => {
    const key = currentTab === 1 ? 'one' : currentTab === 2 ? 'two' : 'three';
    return onboardingCarouselColors[key].background;
  };

  return (
    <View
      style={baseStyles.flexGrow}
      testID={OnboardingCarouselSelectorIDs.CONTAINER_ID}
    >
      <OnboardingScreenWithBg
        screen={'carousel'}
        backgroundColor={getBackgroundColor()}
      >
        <ScrollView
          style={baseStyles.flexGrow}
          contentContainerStyle={styles.scroll}
        >
          <View
            style={styles.wrapper}
            testID={OnboardingCarouselSelectorIDs.CAROUSEL_CONTAINER_ID}
          >
            <ScrollableTabView
              renderTabBar={renderTabBar}
              onChangeTab={onChangeTab}
            >
              {['one', 'two', 'three'].map((value, index) => {
                const key = index + 1;
                const imgStyleKey =
                  `carouselImage${key}` as keyof typeof styles;
                return (
                  <View key={key} style={baseStyles.flexGrow}>
                    <View
                      style={styles.tab}
                      {...generateTestId(
                        Platform,
                        WELCOME_SCREEN_CAROUSEL_TITLE_ID(key),
                      )}
                    >
                      {isTest && (
                        // This Text component is used to grab the App Start Time for our E2E test
                        // ColdStartToOnboardingScreen.feature
                        <Text
                          variant={TextVariant.BodySM}
                          color={TextColor.Alternative}
                          style={styles.metricsData}
                          testID={
                            OnboardingCarouselSelectorIDs.APP_START_TIME_ID
                          }
                        >
                          {appStartTime}
                        </Text>
                      )}
                    </View>
                    <View style={styles.carouselImageWrapper}>
                      <Image
                        source={carousel_images[index]}
                        style={[styles.carouselImage, styles[imgStyleKey]]}
                        resizeMethod={'auto'}
                        testID={`carousel-${value}-image`}
                      />
                    </View>
                    <Text
                      variant={TextVariant.DisplayMD}
                      style={styles.title}
                      color={onboardingCarouselColors[value].color}
                    >
                      {strings(`onboarding_carousel.title${key}`)}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMD}
                      color={onboardingCarouselColors[value].color}
                      style={styles.subtitle}
                    >
                      {strings(`onboarding_carousel.subtitle${key}`)}
                    </Text>
                  </View>
                );
              })}
            </ScrollableTabView>
            <View style={styles.progressContainer}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[styles.bar, currentTab === i ? styles.solidBar : {}]}
                />
              ))}
            </View>
          </View>
        </ScrollView>
        <View
          style={styles.ctas}
          testID={OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID}
        >
          <Button
            variant={ButtonVariants.Primary}
            label={strings('onboarding_carousel.get_started')}
            onPress={onPressGetStarted}
            style={styles.gettingStartedButton}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
          />
        </View>
      </OnboardingScreenWithBg>
      <FadeOutOverlay />
    </View>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(SaveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(OnboardingCarousel);
