import React, { PureComponent } from 'react';
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  InteractionManager,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import ElevatedView from 'react-native-elevated-view';
import { strings } from '../../../../locales/i18n';
import { fontStyles, baseStyles } from '../../../styles/common';
import Device from '../../../util/device';
import { connect } from 'react-redux';
import { backUpSeedphraseAlertNotVisible } from '../../../actions/user';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  NOTIFICATION_REMIND_ME_LATER_BUTTON_ID,
  SECURE_WALLET_BACKUP_ALERT_MODAL,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';

import { ThemeContext, mockTheme } from '../../../util/theme';

const BROWSER_ROUTE = 'BrowserView';

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      position: 'absolute',
      left: 16,
      right: 16,
      borderRadius: 8,
      borderColor: colors.warning.default,
      borderWidth: 1,
    },
    backupAlertWrapper: {
      flex: 1,
      backgroundColor: colors.warning.muted,
      padding: 14,
    },
    backupAlertIconWrapper: {
      marginRight: 10,
    },
    backupAlertIcon: {
      fontSize: 22,
      ...fontStyles.bold,
      color: colors.text.default,
    },
    backupAlertTitle: {
      fontSize: 14,
      marginBottom: 14,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    backupAlertMessage: {
      fontSize: 12,
      color: colors.primary.default,
      marginLeft: 14,
      flex: 1,
      textAlign: 'right',
      ...fontStyles.normal,
    },
    touchableView: {
      flexDirection: 'row',
    },
    modalViewInBrowserView: {
      bottom: Device.isIphoneX() ? 180 : 170,
    },
    modalViewNotInBrowserView: {
      bottom: Device.isIphoneX() ? 120 : 110,
    },
    buttonsWrapper: {
      flexDirection: 'row-reverse',
      alignContent: 'flex-end',
      flex: 1,
    },
    dismissButton: {
      flex: 1,
    },
  });

const BLOCKED_LIST = [
  'ImportPrivateKey',
  'Send',
  'SendTo',
  'Amount',
  'Confirm',
  'Approval',
  'Approve',
  'AddBookmark',
  'RevealPrivateCredentialView',
  'AccountBackupStep',
  'ManualBackupStep',
];

/**
 * PureComponent that renders an alert shown when the
 * seed phrase hasn't been backed up
 */
class BackupAlert extends PureComponent {
  static propTypes = {
    navigation: PropTypes.object,
    /**
     * redux flag that indicates if the user
     * completed the seed phrase backup flow
     */
    seedphraseBackedUp: PropTypes.bool,
    /**
     * redux flag that indicates if the alert should be shown
     */
    backUpSeedphraseVisible: PropTypes.bool,
    /**
     * Dismisses the alert
     */
    backUpSeedphraseAlertNotVisible: PropTypes.func.isRequired,
    /**
     * A second prop to be used in conjunction with the above
     * currently used to toggle the backup reminder modal (a second time)
     */
    onDismiss: PropTypes.func,
    /**
     * Used to determine if onboarding has been completed
     * we only want to render the backup alert after onboarding
     */
    onboardingWizardStep: PropTypes.number,
  };

  state = {
    inBrowserView: false,
    inAccountBackupStep: false,
  };

  componentDidUpdate = async (prevProps) => {
    if (
      prevProps.navigation.dangerouslyGetState() !==
      this.props.navigation.dangerouslyGetState()
    ) {
      const currentRouteName = findRouteNameFromNavigatorState(
        this.props.navigation.dangerouslyGetState().routes,
      );

      const inBrowserView = currentRouteName === BROWSER_ROUTE;
      const blockedView =
        BLOCKED_LIST.find((path) => currentRouteName.includes(path)) ||
        currentRouteName === 'SetPasswordFlow';
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ inBrowserView, blockedView });
    }
  };

  goToBackupFlow = () => {
    this.props.navigation.navigate('SetPasswordFlow', {
      screen: 'AccountBackupStep1',
    });
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.WALLET_SECURITY_PROTECT_ENGAGED,
        {
          wallet_protection_required: false,
          source: 'Backup Alert',
        },
      );
    });
  };

  onDismiss = () => {
    const { onDismiss, backUpSeedphraseAlertNotVisible } = this.props;
    backUpSeedphraseAlertNotVisible();
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.WALLET_SECURITY_PROTECT_DISMISSED,
        {
          wallet_protection_required: false,
          source: 'Backup Alert',
        },
      );
    });
    if (onDismiss) onDismiss();
  };

  render() {
    const {
      seedphraseBackedUp,
      backUpSeedphraseVisible,
      onboardingWizardStep,
    } = this.props;
    const { inBrowserView, blockedView } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    const shouldNotRenderAlert =
      seedphraseBackedUp ||
      blockedView ||
      !backUpSeedphraseVisible ||
      onboardingWizardStep !== 0;

    if (shouldNotRenderAlert) return null;
    return (
      <ElevatedView
        elevation={99}
        style={[
          styles.container,
          inBrowserView
            ? styles.modalViewInBrowserView
            : styles.modalViewNotInBrowserView,
        ]}
      >
        <View style={styles.backupAlertWrapper}>
          <View
            style={styles.touchableView}
            {...generateTestId(Platform, SECURE_WALLET_BACKUP_ALERT_MODAL)}
          >
            <View style={styles.backupAlertIconWrapper}>
              <EvilIcons name="bell" style={styles.backupAlertIcon} />
            </View>
            <View style={baseStyles.flexGrow}>
              <Text style={styles.backupAlertTitle}>
                {strings('backup_alert.title')}
              </Text>
              <View style={styles.buttonsWrapper}>
                <TouchableOpacity onPress={this.goToBackupFlow}>
                  <Text style={[styles.backupAlertMessage, fontStyles.bold]}>
                    {strings('backup_alert.right_button')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={this.onDismiss}
                  style={styles.dismissButton}
                >
                  <Text
                    style={styles.backupAlertMessage}
                    {...generateTestId(
                      Platform,
                      NOTIFICATION_REMIND_ME_LATER_BUTTON_ID,
                    )}
                  >
                    {strings('backup_alert.left_button')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ElevatedView>
    );
  }
}

const mapStateToProps = (state) => ({
  seedphraseBackedUp: state.user.seedphraseBackedUp,
  backUpSeedphraseVisible: state.user.backUpSeedphraseVisible,
  onboardingWizardStep: state.wizard.step,
});

const mapDispatchToProps = (dispatch) => ({
  backUpSeedphraseAlertNotVisible: () =>
    dispatch(backUpSeedphraseAlertNotVisible()),
});

BackupAlert.contextType = ThemeContext;

export default connect(mapStateToProps, mapDispatchToProps)(BackupAlert);
