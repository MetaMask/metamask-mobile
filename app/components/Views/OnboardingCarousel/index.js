import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import StyledButton from '../../UI/StyledButton';
import { fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import OnboardingScreenWithBg from '../../UI/OnboardingScreenWithBg';
import Device from '../../../util/device';
import { saveOnboardingEvent } from '../../../actions/onboarding';
import { connect } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { WELCOME_SCREEN_CAROUSEL_TITLE_ID } from '../../../../wdio/screen-objects/testIDs/Screens/WelcomeScreen.testIds';
import { OnboardingCarouselSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingCarousel.selectors';
import generateTestId from '../../../../wdio/utils/generateTestId';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { isTest } from '../../../util/test/utils';
import StorageWrapper from '../../../store/storage-wrapper';
import { PerformanceRegressionSelectorIDs } from '../../../../e2e/selectors/PerformanceRegression.selectors';

const IMAGE_3_RATIO = 215 / 315;
const IMAGE_2_RATIO = 222 / 239;
const IMAGE_1_RATIO = 285 / 203;
const DEVICE_WIDTH = Dimensions.get('window').width;

const IMG_PADDING = Device.isIphoneX() ? 100 : Device.isIphone5S() ? 180 : 220;

const createStyles = (colors) =>
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
      // flexDirection: 'column',
      // alignItems: 'center',
      // justifyContent: 'center',
      flex: 1,
      marginTop: 12,
      marginBottom: 25,
    },
    metricsData: {
      fontSize: 10,
      // lineHeight: 19,
      color: colors.text.alternative,
      justifyContent: 'center',
      textAlign: 'center',
      // ...fontStyles.normal,
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

/**
 * View that is displayed to first time (new) users
 */
class OnboardingCarousel extends PureComponent {
  static propTypes = {
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * Save onboarding event to state
     */
    saveOnboardingEvent: PropTypes.func,
  };

  state = {
    currentTab: 1,
    nativeLaunchDuration: undefined,
    jsBundleDuration: undefined,
    appStartTime: undefined,
  };

  track = (event, properties) => {
    trackOnboarding(event, properties, this.props.saveOnboardingEvent);
  };

  onPressGetStarted = () => {
    this.props.navigation.navigate('Onboarding');
    this.track(MetaMetricsEvents.ONBOARDING_STARTED);
  };

  renderTabBar = () => <View />;

  onChangeTab = (obj) => {
    this.setState({ currentTab: obj.i + 1 });
    this.track(MetaMetricsEvents.ONBOARDING_WELCOME_SCREEN_ENGAGEMENT, {
      message_title: strings(`onboarding_carousel.title${[obj.i + 1]}`, {
        locale: 'en',
      }),
    });
  };

  updateNavBar = () => {
    const colors = this.context.colors || mockTheme.colors;
    this.props.navigation.setOptions(
      getTransparentOnboardingNavbarOptions(colors),
    );
  };

  componentDidMount = async () => {
    this.updateNavBar();
    this.track(MetaMetricsEvents.ONBOARDING_WELCOME_MESSAGE_VIEWED);
    const nativeLaunchDuration = await StorageWrapper.getItem(
      'nativeLaunchDuration',
    );
    const jsBundleDuration = await StorageWrapper.getItem('jsBundleDuration');
    const appStartTime = await StorageWrapper.getItem('appStartTime');
    this.setState({ nativeLaunchDuration, jsBundleDuration, appStartTime });
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  getJsBundleDuration = async () => {
    return await StorageWrapper.getItem('jsBundleDuration');
  };

  getAppStartTime = async () => {
    return await StorageWrapper.getItem('appStartTime');
  };

  render() {
    const { currentTab, appStartTime } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

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
                style={styles.scrollTabs}
                renderTabBar={this.renderTabBar}
                onChangeTab={this.onChangeTab}
              >
                {['one', 'two', 'three'].map((value, index) => {
                  const key = index + 1;
                  const imgStyleKey = `carouselImage${key}`;
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
                          // PerformanceRegressionTest.feature
                          <Text
                            style={styles.metricsData}
                            testID={
                              PerformanceRegressionSelectorIDs.APP_START_TIME_ID
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
              <StyledButton type={'normal'} onPress={this.onPressGetStarted}>
                {strings('onboarding_carousel.get_started')}
              </StyledButton>
            </View>
          </View>
        </OnboardingScreenWithBg>
        <FadeOutOverlay />
      </View>
    );
  }
}

OnboardingCarousel.contextType = ThemeContext;

const mapDispatchToProps = (dispatch) => ({
  saveOnboardingEvent: (...eventArgs) =>
    dispatch(saveOnboardingEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(OnboardingCarousel);
