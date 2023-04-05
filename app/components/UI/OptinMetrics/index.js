import React, { PureComponent } from 'react';
import {
  View,
  SafeAreaView,
  Text,
  StyleSheet,
  ScrollView,
  BackHandler,
  Alert,
  InteractionManager,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import { baseStyles, fontStyles } from '../../../styles/common';
import Entypo from 'react-native-vector-icons/Entypo';
import { getOptinMetricsNavbarOptions } from '../Navbar';
import { strings } from '../../../../locales/i18n';
import setOnboardingWizardStep from '../../../actions/wizard';
import { connect } from 'react-redux';
import Analytics from '../../../core/Analytics/Analytics';
import { clearOnboardingEvents } from '../../../actions/onboarding';
import {
  ONBOARDING_WIZARD,
  METRICS_OPT_IN,
  DENIED,
  AGREED,
} from '../../../constants/storage';
import AppConstants from '../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import DefaultPreference from 'react-native-default-preference';
import { ThemeContext } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  OPTIN_METRICS_I_AGREE_BUTTON_ID,
  OPTIN_METRICS_NO_THANKS_BUTTON_ID,
  OPTIN_METRICS_TITLE_ID,
  METAMETRICS_OPT_IN_CONTAINER_ID,
  OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/OptinMetricsScreen.testIds';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import { MAINNET } from '../../../constants/network';

const createStyles = ({ colors }) =>
  StyleSheet.create({
    root: {
      ...baseStyles.flexGrow,
      backgroundColor: colors.background.default,
    },
    checkIcon: {
      color: colors.success.default,
    },
    crossIcon: {
      color: colors.error.default,
    },
    icon: {
      marginRight: 5,
    },
    action: {
      flex: 0,
      flexDirection: 'row',
      paddingVertical: 10,
      alignItems: 'center',
    },
    title: {
      ...fontStyles.bold,
      color: colors.text.default,
      fontSize: 22,
    },
    description: {
      ...fontStyles.normal,
      color: colors.text.default,
      flex: 1,
    },
    descriptionBold: {
      ...fontStyles.bold,
    },
    content: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.default,
      paddingVertical: 10,
    },
    wrapper: {
      marginHorizontal: 20,
    },
    privacyPolicy: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.muted,
      marginTop: 10,
    },
    link: {
      textDecorationLine: 'underline',
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
  });

/**
 * View that is displayed in the flow to agree to metrics
 */
class OptinMetrics extends PureComponent {
  static propTypes = {
    /**
    /* navigation object required to push and pop other views
    */
    navigation: PropTypes.object,
    /**
     * Action to set onboarding wizard step
     */
    setOnboardingWizardStep: PropTypes.func,
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
  };

  state = {
    /**
     * Used to control the action buttons state.
     */
    isActionEnabled: false,
  };

  /**
   * Tracks when scroll view has scrolled to end.
   * Needed to prevent scroll event from setting state multiple times.
   */
  isEndReached = false;

  /**
   * Tracks the scroll view's content height.
   */
  scrollViewContentHeight = undefined;

  getStyles = () => {
    const { colors, typography } = this.context;
    return createStyles({ colors, typography });
  };

  actionsList = [1, 2, 3, 4, 5].map((value) => {
    const actionVal = value <= 2 ? 0 : 1;
    return {
      action: actionVal,
      prefix: actionVal
        ? `${strings('privacy_policy.action_description_never')} `
        : '',
      description: strings(`privacy_policy.action_description_${value}`),
    };
  });

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors;
    navigation.setOptions(getOptinMetricsNavbarOptions(colors));
  };

  componentDidMount() {
    this.updateNavBar();
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
  }

  componentDidUpdate = () => {
    this.updateNavBar();
  };

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
    const onContinue = this.props.route?.params?.onContinue;
    if (onContinue) {
      return onContinue();
    }

    // Get onboarding wizard state
    const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
    if (onboardingWizard) {
      this.props.navigation.reset({ routes: [{ name: 'HomeNav' }] });
    } else {
      this.props.setOnboardingWizardStep(1);
      this.props.navigation.reset({ routes: [{ name: 'HomeNav' }] });
    }
  };

  /**
   * Render each action with corresponding icon
   *
   * @param {object} - Object containing action and description to be rendered
   * @param {number} i - Index key
   */
  renderAction = ({ action, description, prefix }, i) => {
    const styles = this.getStyles();

    return (
      <View style={styles.action} key={i}>
        {action === 0 ? (
          <Entypo
            name="check"
            size={20}
            style={[styles.icon, styles.checkIcon]}
          />
        ) : (
          <Entypo
            name="cross"
            size={24}
            style={[styles.icon, styles.crossIcon]}
          />
        )}
        <Text style={styles.description}>
          <Text style={styles.descriptionBold}>{prefix}</Text>
          {description}
        </Text>
      </View>
    );
  };

  /**
   * Track the event of opt in or opt out.
   * @param AnalyticsOptionSelected - User selected option regarding the tracking of events
   */
  trackOptInEvent = (AnalyticsOptionSelected) => {
    InteractionManager.runAfterInteractions(async () => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED, {
        analytics_option_selected: AnalyticsOptionSelected,
        updated_after_onboarding: false,
      });
    });
  };

  /**
   * Callback on press cancel
   */
  onCancel = async () => {
    const { events } = this.props;
    const metricsOptionSelected = 'Metrics Opt Out';
    setTimeout(async () => {
      if (events && events.length) {
        events.forEach((eventArgs) => AnalyticsV2.trackEvent(...eventArgs));
      }
      this.trackOptInEvent(metricsOptionSelected);
      this.props.clearOnboardingEvents();
      await DefaultPreference.set(METRICS_OPT_IN, DENIED);
      Analytics.disableInstance();
    }, 200);
    this.continue();
  };

  /**
   * Callback on press confirm
   */
  onConfirm = async () => {
    const { events } = this.props;
    const metricsOptionSelected = 'Metrics Opt In';
    Analytics.enable();
    setTimeout(async () => {
      if (events && events.length) {
        events.forEach((eventArgs) => AnalyticsV2.trackEvent(...eventArgs));
      }
      this.trackOptInEvent(metricsOptionSelected);
      this.props.clearOnboardingEvents();
      await DefaultPreference.set(METRICS_OPT_IN, AGREED);
    }, 200);
    this.continue();
  };

  /**
   * Open RPC settings.
   */
  openRPCSettings = () => {
    this.props.navigation.navigate('NetworkSettings', {
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

    return (
      <View>
        <Text style={styles.privacyPolicy}>
          <Text>{strings('privacy_policy.fine_print_1')}</Text>
          {'\n\n'}
          {strings('privacy_policy.fine_print_2a') + ' '}
          <Button
            variant={ButtonVariants.Link}
            label={strings('privacy_policy.here')}
            onPress={this.openRPCSettings}
          />
          {' ' + strings('privacy_policy.fine_print_2b') + ' '}
          <Button
            variant={ButtonVariants.Link}
            onPress={this.openDataRetentionPost}
            label={strings('privacy_policy.here')}
          />
          {strings('privacy_policy.fine_print_2c') + ' '}
          <Button
            variant={ButtonVariants.Link}
            label={strings('privacy_policy.here')}
            onPress={this.openPrivacyPolicy}
          />
          {strings('unit.point')}
        </Text>
      </View>
    );
  };

  renderActionButtons = () => {
    const { isActionEnabled } = this.state;
    const styles = this.getStyles();
    // Once buttons are refactored, it should auto handle disabled colors.
    const buttonContainerStyle = [
      styles.actionContainer,
      isActionEnabled ? undefined : styles.disabledActionContainer,
    ];

    return (
      <View style={buttonContainerStyle}>
        <Button
          variant={ButtonVariants.Secondary}
          onPress={this.onCancel}
          {...generateTestId(Platform, OPTIN_METRICS_NO_THANKS_BUTTON_ID)}
          style={styles.button}
          label={strings('privacy_policy.cta_no_thanks')}
          size={ButtonSize.Lg}
          disabled={!isActionEnabled}
        />
        <View style={styles.buttonDivider} />
        <Button
          variant={ButtonVariants.Primary}
          onPress={this.onConfirm}
          {...generateTestId(Platform, OPTIN_METRICS_I_AGREE_BUTTON_ID)}
          style={styles.button}
          label={strings('privacy_policy.cta_i_agree')}
          size={ButtonSize.Lg}
          disabled={!isActionEnabled}
        />
      </View>
    );
  };

  /**
   * Triggered when scroll view has reached end of content.
   */
  onScrollEndReached = () => {
    this.isEndReached = true;
    this.setState({ isActionEnabled: true });
  };

  /**
   * Content size change event for the ScrollView.
   *
   * @param {number} _
   * @param {number} height
   */
  onContentSizeChange = (_, height) => (this.scrollViewContentHeight = height);

  /**
   * Layout event for the ScrollView.
   *
   * @param {Object} event
   */
  onLayout = ({ nativeEvent }) => {
    if (this.scrollViewContentHeight === undefined || this.isEndReached) return;
    const scrollViewHeight = nativeEvent.layout.height;
    // Check if content fits view port of scroll view.
    if (scrollViewHeight >= this.scrollViewContentHeight)
      this.onScrollEndReached();
  };

  /**
   * Scroll event for the ScrollView.
   *
   * @param {Object} event
   */
  onScroll = ({ nativeEvent }) => {
    if (this.isEndReached) return;
    const currentYOffset = nativeEvent.contentOffset.y;
    const paddingAllowance = 16;
    const endThreshold =
      nativeEvent.contentSize.height -
      nativeEvent.layoutMeasurement.height -
      paddingAllowance;
    // Check when scroll has reached the end.
    if (currentYOffset >= endThreshold) this.onScrollEndReached();
  };

  render() {
    const styles = this.getStyles();

    return (
      <SafeAreaView
        style={styles.root}
        {...generateTestId(Platform, METAMETRICS_OPT_IN_CONTAINER_ID)}
      >
        <ScrollView
          style={styles.root}
          scrollEventThrottle={150}
          onContentSizeChange={this.onContentSizeChange}
          onLayout={this.onLayout}
          onScroll={this.onScroll}
        >
          <View style={styles.wrapper}>
            <Text
              style={styles.title}
              {...generateTestId(Platform, OPTIN_METRICS_TITLE_ID)}
            >
              {strings('privacy_policy.description_title')}
            </Text>
            <Text
              style={styles.content}
              {...generateTestId(
                Platform,
                OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
              )}
            >
              {strings('privacy_policy.description_content_1')}
            </Text>
            <Text style={styles.content}>
              {strings('privacy_policy.description_content_2')}
            </Text>
            {this.actionsList.map((action, i) => this.renderAction(action, i))}
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
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
  clearOnboardingEvents: () => dispatch(clearOnboardingEvents()),
});

export default connect(mapStateToProps, mapDispatchToProps)(OptinMetrics);
