import React, { PureComponent } from 'react';
import {
  View,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  BackHandler,
  Alert,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import PropTypes from 'prop-types';
import { baseStyles, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { clearOnboardingEvents } from '../../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { OPTIN_META_METRICS_UI_SEEN, TRUE } from '../../../constants/storage';
import {
  MetaMetricsEvents,
  withMetricsAwareness,
} from '../../hooks/useMetrics';
import StorageWrapper from '../../../store/storage-wrapper';
import { ThemeContext } from '../../../util/theme';
import { MetaMetricsOptInSelectorsIDs } from '../../../../e2e/selectors/Onboarding/MetaMetricsOptIn.selectors';
import Checkbox from '../../../component-library/components/Checkbox';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import { isPastPrivacyPolicyDate } from '../../../reducers/legalNotices';
import Routes from '../../../constants/navigation/Routes';
import generateDeviceAnalyticsMetaData, {
  UserSettingsAnalyticsMetaData as generateUserSettingsAnalyticsMetaData,
} from '../../../util/metrics';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { getConfiguredCaipChainIds } from '../../../util/metrics/MultichainAPI/networkMetricUtils';
import { updateCachedConsent, flushBufferedTraces } from '../../../util/trace';
import { setupSentry } from '../../../util/sentry/utils';
import Device from '../../../util/device';
import PrivacyIllustration from '../../../images/privacy_metrics_illustration.png';

const createStyles = ({ colors }) =>
  StyleSheet.create({
    root: {
      ...baseStyles.flexGrow,
      backgroundColor: colors.background.default,
      paddingTop:
        Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 24,
      paddingBottom: 16,
    },
    checkbox: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
      marginRight: 25,
    },
    action: {
      flex: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
    },
    description: {
      flex: 1,
    },
    wrapper: {
      marginHorizontal: 20,
      flex: 1,
      flexDirection: 'column',
      rowGap: 16,
      paddingBottom: 80, // Space for fixed action buttons at bottom
    },
    privacyPolicy: {
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.text.muted,
    },
    actionContainer: {
      flexDirection: 'row',
      padding: 16,
    },
    disabledActionContainer: {
      opacity: 0.3,
    },
    button: {
      flex: 1,
    },
    buttonDivider: {
      width: 16,
    },
    cancel: {
      marginRight: 8,
    },
    confirm: {
      marginLeft: 8,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.muted,
    },
    title: {
      fontWeight: '700',
    },
    sectionContainer: {
      backgroundColor: colors.background.section,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    imageContainer: {
      alignItems: 'center',
      marginVertical: Device.isMediumDevice() ? 8 : 12,
    },
    illustration: {
      width: Device.isMediumDevice() ? 160 : 200,
      height: Device.isMediumDevice() ? 120 : 150,
      alignSelf: 'center',
    },
    flexContainer: {
      flex: 1,
    },
    descriptionText: {
      marginTop: 4,
      marginLeft: 0,
    },
  });

/**
 * View that is displayed in the flow to agree to metrics
 */
class OptinMetrics extends PureComponent {
  static propTypes = {
    setDataCollectionForMarketing: PropTypes.func,
    /**
    /* navigation object required to push and pop other views
    */
    navigation: PropTypes.object,
    /**
     * Onboarding events array created in previous onboarding views
     */
    events: PropTypes.array,
    /**
     * Action to erase any event stored in onboarding state
     */
    clearOnboardingEvents: PropTypes.func,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
  };

  state = {
    /**
     * Tracks the scroll view's content height.
     */
    scrollViewContentHeight: undefined,
    /**
     * Tracks when scroll view has scrolled to end.
     * Needed to prevent scroll event from setting state multiple times.
     */
    isEndReached: false,
    /**
     * Tracks the scroll view's height.
     */
    scrollViewHeight: undefined,
    /**
     * Tracks the checkbox's checked state.
     */
    isCheckboxChecked: false,
    /**
     * Tracks the basic usage checkbox's checked state.
     */
    isBasicUsageChecked: true,
  };

  getStyles = () => {
    const { colors, typography } = this.context;
    return createStyles({ colors, typography });
  };

  componentDidMount() {
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
  }

  componentDidUpdate(_, prevState) {
    const { scrollViewContentHeight, isEndReached, scrollViewHeight } =
      this.state;

    // Only run this check if any of the relevant values have changed
    if (
      prevState.scrollViewContentHeight !== scrollViewContentHeight ||
      prevState.isEndReached !== isEndReached ||
      prevState.scrollViewHeight !== scrollViewHeight
    ) {
      if (scrollViewContentHeight === undefined) return;

      // Check if content fits view port of scroll view
      if (scrollViewHeight >= scrollViewContentHeight && !isEndReached) {
        this.onScrollEndReached();
      }
    }
  }

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
  }

  /**
   * Temporary disabling the back button so users can't go back
   */
  handleBackPress = () => {
    Alert.alert(
      strings('onboarding.optin_back_title'),
      strings('onboarding.optin_back_desc'),
    );
  };

  /**
   * Action to be triggered when pressing any button
   */
  continue = async () => {
    await StorageWrapper.setItem(OPTIN_META_METRICS_UI_SEEN, TRUE);

    const onContinue = this.props.route?.params?.onContinue;
    if (onContinue) {
      return onContinue();
    }

    this.props.navigation.reset({
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
  };

  /**
   * Callback on press confirm
   */
  onConfirm = async () => {
    const { events, metrics, setDataCollectionForMarketing } = this.props;

    await metrics.enable(this.state.isBasicUsageChecked);
    await setupSentry(); // Re-setup Sentry with enabled: true
    await flushBufferedTraces();
    updateCachedConsent(this.state.isBasicUsageChecked);

    setDataCollectionForMarketing(this.state.isCheckboxChecked);

    // Track the analytics preference event first
    metrics.trackEvent(
      metrics
        .createEventBuilder(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED)
        .addProperties({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: Boolean(
            this.state.isCheckboxChecked,
          ),
          is_metrics_opted_in: this.state.isBasicUsageChecked,
          location: 'onboarding_metametrics',
          updated_after_onboarding: false,
        })
        .build(),
    );

    await metrics.addTraitsToUser({
      ...generateDeviceAnalyticsMetaData(),
      ...generateUserSettingsAnalyticsMetaData(),
      [UserProfileProperty.CHAIN_IDS]: getConfiguredCaipChainIds(),
    });

    // track onboarding events that were stored before user opted in
    // only if the user eventually opts in.
    if (events && events.length) {
      let delay = 0; // Initialize delay
      const eventTrackingDelay = 200; // ms delay between each event
      events.forEach((eventArgs) => {
        // delay each event to prevent them from
        // being tracked with the same timestamp
        // which would cause them to be grouped together
        // by sentAt time in the Segment dashboard
        // as precision is only to the milisecond
        // and loop seems to runs faster than that
        setTimeout(() => {
          metrics.trackEvent(...eventArgs);
        }, delay);
        delay += eventTrackingDelay;
      });
    }
    this.props.clearOnboardingEvents();
    this.continue();
  };

  /**
   * Opens link when provided link params.
   *
   * @param {Object} linkParams
   * @param {string} linkParams.url
   * @param {string} linkParams.title
   */
  onPressLink = (linkParams) => {
    this.props.navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: linkParams,
    });
  };

  openLearnMore = () =>
    this.onPressLink({
      url: 'https://support.metamask.io/configure/privacy/how-to-manage-your-metametrics-settings/',
      title: 'How to manage your MetaMetrics settings',
    });

  renderActionButtons = () => {
    const styles = this.getStyles();

    return (
      <View style={styles.actionContainer}>
        <Button
          variant={ButtonVariants.Primary}
          onPress={this.onConfirm}
          testID={MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_I_AGREE_BUTTON_ID}
          style={styles.button}
          label={strings('privacy_policy.continue')}
          size={ButtonSize.Lg}
        />
      </View>
    );
  };

  /**
   * Triggered when scroll view has reached end of content.
   */
  onScrollEndReached = () => {
    this.setState({ isEndReached: true });
  };

  /**
   * Content size change event for the ScrollView.
   *
   * @param {number} _
   * @param {number} height
   */
  onContentSizeChange = (_, height) =>
    this.setState({ scrollViewContentHeight: height });

  /**
   * Layout event for the ScrollView.
   *
   * @param {Object} event
   */
  onLayout = ({ nativeEvent }) => {
    const scrollViewHeight = nativeEvent.layout.height;
    this.setState({ scrollViewHeight });
  };

  /**
   * Scroll event for the ScrollView.
   *
   * @param {Object} event
   */
  onScroll = ({ nativeEvent }) => {
    const currentYOffset = nativeEvent.contentOffset.y;
    const paddingAllowance = Platform.select({
      ios: 16,
      android: 32,
    });
    const endThreshold =
      nativeEvent.contentSize.height -
      nativeEvent.layoutMeasurement.height -
      paddingAllowance;

    // Check when scroll has reached the end.
    if (currentYOffset >= endThreshold && !this.state.isEndReached) {
      this.onScrollEndReached();
    }
  };

  render() {
    const styles = this.getStyles();

    return (
      <SafeAreaView style={styles.root}>
        <ScrollView
          style={styles.root}
          scrollEventThrottle={150}
          onContentSizeChange={this.onContentSizeChange}
          onLayout={this.onLayout}
          onScroll={this.onScroll}
          testID={MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID}
        >
          <View style={styles.wrapper}>
            <Text
              variant={TextVariant.DisplayMD}
              color={TextColor.Default}
              style={styles.title}
              testID={MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_TITLE_ID}
            >
              {strings('privacy_policy.description_title')}
            </Text>
            <View style={styles.imageContainer}>
              <Image
                source={PrivacyIllustration}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              testID={
                MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID
              }
            >
              {strings(
                isPastPrivacyPolicyDate
                  ? 'privacy_policy.description_content_1'
                  : 'privacy_policy.description_content_1_legacy',
              )}
            </Text>
            {isPastPrivacyPolicyDate ? (
              <View>
                <View style={styles.sectionContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() =>
                      this.setState((prevState) => ({
                        isBasicUsageChecked: !prevState.isBasicUsageChecked,
                      }))
                    }
                    activeOpacity={1}
                  >
                    <Checkbox
                      isChecked={this.state.isBasicUsageChecked}
                      accessibilityRole={'checkbox'}
                      accessible
                      onPress={() =>
                        this.setState((prevState) => ({
                          isBasicUsageChecked: !prevState.isBasicUsageChecked,
                        }))
                      }
                    />
                    <View style={styles.flexContainer}>
                      <Text
                        variant={TextVariant.BodySMMedium}
                        color={TextColor.Default}
                      >
                        {strings('privacy_policy.gather_basic_usage_title')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                    style={styles.descriptionText}
                  >
                    {strings('privacy_policy.gather_basic_usage_description') +
                      ' '}
                    <Text
                      color={TextColor.Primary}
                      variant={TextVariant.BodySM}
                      onPress={this.openLearnMore}
                    >
                      {strings('privacy_policy.gather_basic_usage_learn_more')}
                    </Text>
                  </Text>
                </View>
                <View style={styles.sectionContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() =>
                      this.setState((prevState) => ({
                        isCheckboxChecked: !prevState.isCheckboxChecked,
                      }))
                    }
                    activeOpacity={1}
                  >
                    <Checkbox
                      isChecked={this.state.isCheckboxChecked}
                      accessibilityRole={'checkbox'}
                      accessible
                      onPress={() =>
                        this.setState((prevState) => ({
                          isCheckboxChecked: !prevState.isCheckboxChecked,
                        }))
                      }
                    />
                    <View style={styles.flexContainer}>
                      <Text
                        variant={TextVariant.BodySMMedium}
                        color={TextColor.Default}
                      >
                        {strings('privacy_policy.checkbox_marketing')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                    style={styles.descriptionText}
                  >
                    {strings('privacy_policy.checkbox')}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
        {this.renderActionButtons()}
      </SafeAreaView>
    );
  }
}

OptinMetrics.contextType = ThemeContext;
OptinMetrics.navigationOptions = {
  headerShown: false,
};

const mapStateToProps = (state) => ({
  events: state.onboarding.events,
});

const mapDispatchToProps = (dispatch) => ({
  clearOnboardingEvents: () => dispatch(clearOnboardingEvents()),
  setDataCollectionForMarketing: (value) =>
    dispatch(setDataCollectionForMarketing(value)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(OptinMetrics));
