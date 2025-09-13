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
} from 'react-native';
import PropTypes from 'prop-types';
import { baseStyles, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { clearOnboardingEvents } from '../../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { OPTIN_META_METRICS_UI_SEEN, TRUE } from '../../../constants/storage';
import AppConstants from '../../../core/AppConstants';
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
import { MAINNET } from '../../../constants/network';
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
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { getConfiguredCaipChainIds } from '../../../util/metrics/MultichainAPI/networkMetricUtils';
import {
  updateCachedConsent,
  flushBufferedTraces,
  discardBufferedTraces,
} from '../../../util/trace';
import { setupSentry } from '../../../util/sentry/utils';

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
  };

  getStyles = () => {
    const { colors, typography } = this.context;
    return createStyles({ colors, typography });
  };

  actionsList = isPastPrivacyPolicyDate
    ? [1, 2, 3].map((value) => ({
        action: value,
        prefix: strings(`privacy_policy.action_description_${value}_prefix`),
        description: strings(
          `privacy_policy.action_description_${value}_description`,
        ),
      }))
    : [1, 2, 3, 4, 5].map((value) => {
        const actionVal = value <= 2 ? 0 : 1;
        return {
          action: actionVal,
          prefix: actionVal
            ? `${strings('privacy_policy.action_description_never_legacy')} `
            : '',
          description: strings(
            `privacy_policy.action_description_${value}_legacy`,
          ),
        };
      });

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
   * Render each action with corresponding icon
   *
   * @param {object} - Object containing action and description to be rendered
   * @param {number} i - Index key
   */
  renderLegacyAction = ({ action, description, prefix }, i) => {
    const styles = this.getStyles();

    return (
      <View style={styles.action} key={i}>
        {action === 0 ? (
          <Icon
            name={IconName.CheckBold}
            size={IconSize.Lg}
            color={IconColor.Success}
          />
        ) : (
          <Icon
            name={IconName.CircleX}
            size={IconSize.Lg}
            color={IconColor.Error}
          />
        )}
        <Text style={styles.description}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {prefix}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {description}
          </Text>
        </Text>
      </View>
    );
  };

  renderAction = ({ description, prefix }, i) => {
    const styles = this.getStyles();

    return (
      <View style={styles.action} key={i}>
        <Icon
          name={IconName.CheckBold}
          size={IconSize.Lg}
          color={IconColor.Success}
        />
        <Text style={styles.description}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {prefix + ' '}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {description}
          </Text>
        </Text>
      </View>
    );
  };

  /**
   * Callback on press cancel
   */
  onCancel = async () => {
    setTimeout(async () => {
      const { clearOnboardingEvents, metrics, setDataCollectionForMarketing } =
        this.props;
      // Ensure marketing data collection is explicitly disabled when declining metrics
      setDataCollectionForMarketing(false);
      // if users refuses tracking, get rid of the stored events
      // and never send them to Segment
      // and disable analytics
      clearOnboardingEvents();
      await metrics.enable(false);
      await setupSentry(); // Re-setup Sentry with enabled: false
      discardBufferedTraces();
      updateCachedConsent(false);
    }, 200);
    this.continue();
  };

  /**
   * Callback on press confirm
   */
  onConfirm = async () => {
    const { events, metrics, setDataCollectionForMarketing } = this.props;

    await metrics.enable();
    await setupSentry(); // Re-setup Sentry with enabled: true
    await flushBufferedTraces();
    updateCachedConsent(true);

    setDataCollectionForMarketing(this.state.isCheckboxChecked);

    // Track the analytics preference event first
    metrics.trackEvent(
      metrics
        .createEventBuilder(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED)
        .addProperties({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: Boolean(
            this.state.isCheckboxChecked,
          ),
          is_metrics_opted_in: true,
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
   * Open RPC settings.
   */
  openRPCSettings = () => {
    this.props.navigation.navigate(Routes.ADD_NETWORK, {
      network: MAINNET,
      isCustomMainnet: true,
    });
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

  /**
   * Open privacy policy in webview.
   */
  openPrivacyPolicy = () =>
    this.onPressLink({
      url: AppConstants.URLS.PRIVACY_POLICY,
      title: strings('privacy_policy.title'),
    });

  /**
   * Open data retention post in webview.
   */
  openDataRetentionPost = () =>
    this.onPressLink({
      url: AppConstants.URLS.DATA_RETENTION_UPDATE,
      title: '',
    });

  /**
   * Render privacy policy description
   *
   * @returns - Touchable opacity object to render with privacy policy information
   */
  renderPrivacyPolicy = () => {
    const styles = this.getStyles();

    if (isPastPrivacyPolicyDate) {
      return (
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {strings('privacy_policy.fine_print_1') + ' '}
          <Text
            color={TextColor.Primary}
            variant={TextVariant.BodySM}
            onPress={this.openPrivacyPolicy}
          >
            {strings('privacy_policy.privacy_policy_button')}
          </Text>
          {' ' + strings('privacy_policy.fine_print_2')}
        </Text>
      );
    }

    return (
      <View>
        <Text style={styles.privacyPolicy}>
          <Text>{strings('privacy_policy.fine_print_1_legacy')}</Text>
          {'\n\n'}
          {strings('privacy_policy.fine_print_2a_legacy') + ' '}
          <Button
            variant={ButtonVariants.Link}
            label={strings('privacy_policy.here_legacy')}
            onPress={this.openRPCSettings}
          />
          {' ' + strings('privacy_policy.fine_print_2b_legacy') + ' '}
          <Button
            variant={ButtonVariants.Link}
            onPress={this.openDataRetentionPost}
            label={strings('privacy_policy.here_legacy')}
          />
          {strings('privacy_policy.fine_print_2c_legacy') + ' '}
          <Button
            variant={ButtonVariants.Link}
            label={strings('privacy_policy.here_legacy')}
            onPress={this.openPrivacyPolicy}
          />
          {strings('unit.point')}
        </Text>
      </View>
    );
  };

  renderActionButtons = () => {
    const styles = this.getStyles();

    return (
      <View style={styles.actionContainer}>
        <Button
          variant={ButtonVariants.Secondary}
          onPress={this.onCancel}
          testID={
            MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_NO_THANKS_BUTTON_ID
          }
          style={styles.button}
          label={strings('privacy_policy.cta_no_thanks')}
          size={ButtonSize.Lg}
        />
        <View style={styles.buttonDivider} />
        <Button
          variant={ButtonVariants.Primary}
          onPress={this.onConfirm}
          testID={MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_I_AGREE_BUTTON_ID}
          style={styles.button}
          label={strings('privacy_policy.cta_i_agree')}
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
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
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
            {this.actionsList.map((action, i) =>
              isPastPrivacyPolicyDate
                ? this.renderAction(action, i)
                : this.renderLegacyAction(action, i),
            )}
            {isPastPrivacyPolicyDate ? (
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
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Default}
                >
                  {strings('privacy_policy.checkbox')}
                </Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.divider} />
            {this.renderPrivacyPolicy()}
          </View>
        </ScrollView>
        {this.renderActionButtons()}
      </SafeAreaView>
    );
  }
}

OptinMetrics.contextType = ThemeContext;

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
