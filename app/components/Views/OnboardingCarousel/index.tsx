import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { isQa, isTest } from '../../../util/test/utils';
import StorageWrapper from '../../../store/storage-wrapper';
import { Dispatch } from 'redux';
import {
  saveOnboardingEvent as saveEvent,
  OnboardingActionTypes,
} from '../../../actions/onboarding';
import navigateTermsOfUse from '../../../util/termsOfUse/termsOfUse';
import { USE_TERMS } from '../../../constants/storage';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { lightTheme } from '@metamask/design-tokens';

const IMAGE_RATIO = 250 / 200;
const DEVICE_WIDTH = Dimensions.get('window').width;
const DEVICE_HEIGHT = Dimensions.get('window').height;
const ANDROID_PADDING = DEVICE_HEIGHT > 800 ? 80 : 150;
const IOS_PADDING = Device.isIphoneX() ? 80 : Device.isIphone5S() ? 160 : 150;
const IMG_PADDING = Device.isAndroid() ? ANDROID_PADDING : IOS_PADDING;

// Reduce image size for medium devices
const getCarouselSize = () => {
  const baseWidth = DEVICE_WIDTH - IMG_PADDING;
  const adjustedWidth = Device.isMediumDevice() ? baseWidth * 0.85 : baseWidth;
  return {
    width: adjustedWidth,
    height: adjustedWidth * IMAGE_RATIO,
  };
};

const carouselSize = getCarouselSize();

const ctaIosPaddingBottom = Device.isIphoneX() ? 40 : 20;
const createStyles = (safeAreaInsets: { top: number; bottom: number }) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 1,
      justifyContent: 'space-between',
    },
    wrapper: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      paddingBottom: 16,
      paddingTop: Device.isMediumDevice()
        ? 16
        : Platform.OS === 'android'
        ? Math.max(safeAreaInsets.top + 8, 32)
        : 0,
    },
    title: {
      fontSize: Device.isMediumDevice() ? 30 : 40,
      lineHeight: Device.isMediumDevice() ? 30 : 40,
      justifyContent: 'center',
      textAlign: 'center',
      paddingHorizontal: Device.isMediumDevice() ? 16 : 24,
      fontFamily:
        Platform.OS === 'android' ? 'MM Sans Regular' : 'MMSans-Regular',
    },
    subtitle: {
      textAlign: 'center',
    },
    ctas: {
      paddingHorizontal: 16,
      paddingTop: Device.isMediumDevice() ? 12 : 16,
      paddingBottom:
        Platform.OS === 'android'
          ? Math.max(
              safeAreaInsets.bottom + (Device.isMediumDevice() ? 12 : 16),
              24,
            )
          : ctaIosPaddingBottom,
      flexDirection: 'column',
    },
    carouselImage: {},
    carouselImage1: {
      ...carouselSize,
      resizeMode: 'contain',
    },
    carouselImage2: {
      ...carouselSize,
      resizeMode: 'contain',
    },
    carouselImage3: {
      ...carouselSize,
      resizeMode: 'contain',
    },
    carouselImageWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: Device.isMediumDevice() ? 180 : 200,
      paddingHorizontal: 16,
    },
    carouselTextWrapper: {
      flex: 2,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: Device.isMediumDevice() ? 12 : 16,
      gap: Device.isMediumDevice() ? 12 : 16,
    },
    bar: {
      width: 10,
      height: 2,
      backgroundColor: lightTheme.colors.text.default,
      opacity: 0.4,
      marginHorizontal: 2,
    },
    solidBar: {
      opacity: 1,
    },
    progressContainer: {
      flexDirection: 'row',
      alignSelf: 'center',
      paddingTop: 16,
    },
    tab: {
      marginHorizontal: 16,
      position: 'relative',
      minHeight: 30,
    },
    metricsData: {
      textAlign: 'center',
      paddingVertical: 16,
    },
    blackButton: {
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
  const safeAreaInsets = useSafeAreaInsets();

  const styles = createStyles(safeAreaInsets);

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
    const isTermsAccepted = await StorageWrapper.getItem(USE_TERMS);
    if (!isTermsAccepted) {
      await termsOfUse();
    } else {
      navigateToOnboarding();
    }
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

  const currentTabKey = useMemo(() => {
    switch (currentTab) {
      case 1:
        return 'one';
      case 2:
        return 'two';
      default:
        return 'three';
    }
  }, [currentTab]);

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getOnboardingCarouselNavbarOptions(
        onboardingCarouselColors[currentTabKey].background,
      ),
    );
  }, [navigation, currentTabKey]);

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

  const backgroundColor = useMemo(
    () => onboardingCarouselColors[currentTabKey].background,
    [currentTabKey],
  );

  return (
    <View
      style={baseStyles.flexGrow}
      testID={OnboardingCarouselSelectorIDs.CONTAINER_ID}
    >
      <OnboardingScreenWithBg
        screen={'carousel'}
        backgroundColor={backgroundColor}
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
                      {(isTest || isQa) && (
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
                    <View style={styles.carouselTextWrapper}>
                      <Text
                        variant={TextVariant.BodyMD}
                        style={styles.title}
                        color={onboardingCarouselColors[value].color}
                      >
                        {strings(`onboarding_carousel.title${key}`)}
                      </Text>
                      <Text
                        variant={
                          Device.isMediumDevice()
                            ? TextVariant.BodySM
                            : TextVariant.BodyMD
                        }
                        color={onboardingCarouselColors[value].color}
                        style={styles.subtitle}
                      >
                        {strings(`onboarding_carousel.subtitle${key}`)}
                      </Text>
                    </View>
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
        <View style={styles.ctas}>
          <Button
            variant={ButtonVariants.Primary}
            label={
              <Text
                variant={TextVariant.BodyMDMedium}
                color={constColors.btnBlackText}
              >
                {strings('onboarding_carousel.get_started')}
              </Text>
            }
            onPress={onPressGetStarted}
            width={ButtonWidthTypes.Full}
            size={Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg}
            testID={OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID}
            style={styles.blackButton}
          />
        </View>
      </OnboardingScreenWithBg>
      <FadeOutOverlay />
    </View>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(OnboardingCarousel);
