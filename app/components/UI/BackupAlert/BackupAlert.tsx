/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  InteractionManager,
  Platform,
} from 'react-native';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import ElevatedView from 'react-native-elevated-view';
import { strings } from '../../../../locales/i18n';
import { fontStyles, baseStyles } from '../../../styles/common';
import { useDispatch, useSelector } from 'react-redux';
import { backUpSeedphraseAlertNotVisible } from '../../../actions/user';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  NOTIFICATION_REMIND_ME_LATER_BUTTON_ID,
  SECURE_WALLET_BACKUP_ALERT_MODAL,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import styleSheet from './BackupAlert.styles';
import { useStyles } from '../../../component-library/hooks';
import { BackupAlertI } from './BackupAlert.types';

const BROWSER_ROUTE = 'BrowserView';

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

const BackupAlert = ({ navigation, onDismiss }: BackupAlertI) => {
  const { styles } = useStyles(styleSheet, {});

  const [inBrowserView, setInBrowserView] = useState(false);
  const [inBlockedView, setInBlockedView] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const { seedphraseBackedUp, backUpSeedphraseVisible } = useSelector(
    (state: any) => state.user,
  );

  const onboardingWizardStep = useSelector((state: any) => state.wizard.step);
  const dispatch = useDispatch();

  const currentRouteName = findRouteNameFromNavigatorState(
    navigation.dangerouslyGetState().routes,
  );

  useEffect(() => {
    const isInBrowserView = currentRouteName === BROWSER_ROUTE;
    const blockedView =
      BLOCKED_LIST.find((path) => currentRouteName.includes(path)) ||
      currentRouteName === 'SetPasswordFlow';

    setInBrowserView(isInBrowserView);
    setInBlockedView(!!blockedView);
  }, [currentRouteName]);

  const goToBackupFlow = () => {
    setIsVisible(false);
    navigation.navigate('SetPasswordFlow', {
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

  const onDismissAlert = () => {
    dispatch(backUpSeedphraseAlertNotVisible());
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

  const shouldNotRenderAlert =
    seedphraseBackedUp ||
    inBlockedView ||
    !backUpSeedphraseVisible ||
    onboardingWizardStep !== 0 ||
    !isVisible;

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
              <TouchableOpacity onPress={goToBackupFlow}>
                <Text style={[styles.backupAlertMessage, fontStyles.bold]}>
                  {strings('backup_alert.right_button')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDismissAlert}
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
};

export default BackupAlert;
