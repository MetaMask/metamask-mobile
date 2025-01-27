import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Text,
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
import StyledButton from '../../UI/StyledButton';
import { fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
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

const IMAGE_3_RATIO = 215 / 315;
const IMAGE_2_RATIO = 222 / 239;
const IMAGE_1_RATIO = 285 / 203;
const DEVICE_WIDTH = Dimensions.get('window').width;

const IMG_PADDING = Device.isIphoneX() ? 100 : Device.isIphone5S() ? 180 : 220;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 1,
    },
    wrapper: {
      paddingVertical: 30,
      flex: 1,
    },
    title: {
      fontSize: 24,
      marginBottom: 12,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.bold,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 19,
      marginTop: 12,
      marginBottom: 25,
      color: colors.text.alternative,
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.normal,
    },
    ctas: {
      paddingHorizontal: 40,
      paddingBottom: Device.isIphoneX() ? 40 : 20,
      flexDirection: 'column',
    },
    ctaWrapper: {
      justifyContent: 'flex-end',
    },
    carouselImage: {},
    // eslint-disable-next-line react-native/no-unused-styles
    carouselImage1: {
      marginTop: 30,
      width: DEVICE_WIDTH - IMG_PADDING,
      height: (DEVICE_WIDTH - IMG_PADDING) * IMAGE_1_RATIO,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    carouselImage2: {
      width: DEVICE_WIDTH - IMG_PADDING,
      height: (DEVICE_WIDTH - IMG_PADDING) * IMAGE_2_RATIO,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    carouselImage3: {
      width: DEVICE_WIDTH - 60,
      height: (DEVICE_WIDTH - 60) * IMAGE_3_RATIO,
    },
    carouselImageWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    circle: {
      width: 8,
      height: 8,
      borderRadius: 8 / 2,
      backgroundColor: colors.icon.default,
      opacity: 0.4,
      marginHorizontal: 8,
    },
    solidCircle: {
      opacity: 1,
    },
    progessContainer: {
      flexDirection: 'row',
      alignSelf: 'center',
      marginVertical: 36,
    },
    tab: {
      marginHorizontal: 30,
    },
    metricsWrapper: {
      flex: 1,
      marginTop: 12,
      marginBottom: 25,
    },
    metricsData: {
      fontSize: 10,
      color: colors.text.alternative,
      textAlign: 'center',
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

  const onPressGetStarted = () => {
    navigation.navigate('Onboarding');
    track(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ONBOARDING_STARTED,
      ).build(),
    );
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

  const updateNavBar = useCallback(() => {
    navigation.setOptions(getTransparentOnboardingNavbarOptions(colors));
  }, [navigation, colors]);

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

  return (
    <View
      style={baseStyles.flexGrow}
      testID={OnboardingCarouselSelectorIDs.CONTAINER_ID}
    >
      <OnboardingScreenWithBg screen={'carousel'}>
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
                      <Text style={styles.title}>
                        {strings(`onboarding_carousel.title${key}`)}
                      </Text>
                      {isTest && (
                        // This Text component is used to grab the App Start Time for our E2E test
                        // ColdStartToOnboardingScreen.feature
                        <Text
                          style={styles.metricsData}
                          testID={
                            OnboardingCarouselSelectorIDs.APP_START_TIME_ID
                          }
                        >
                          {appStartTime}
                        </Text>
                      )}
                      <Text style={styles.subtitle}>
                        {strings(`onboarding_carousel.subtitle${key}`)}
                      </Text>
                    </View>
                    <View style={styles.carouselImageWrapper}>
                      <Image
                        source={carousel_images[index]}
                        style={[styles.carouselImage, styles[imgStyleKey]]}
                        resizeMethod={'auto'}
                        testID={`carousel-${value}-image`}
                      />
                    </View>
                  </View>
                );
              })}
            </ScrollableTabView>

            <View style={styles.progessContainer}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.circle,
                    currentTab === i ? styles.solidCircle : {},
                  ]}
                />
              ))}
            </View>
          </View>
        </ScrollView>
        <View
          style={styles.ctas}
          testID={OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID}
        >
          <View style={styles.ctaWrapper}>
            <StyledButton type={'normal'} onPress={onPressGetStarted}>
              {strings('onboarding_carousel.get_started')}
            </StyledButton>
          </View>
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
