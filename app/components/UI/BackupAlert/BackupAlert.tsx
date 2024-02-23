/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import ElevatedView from 'react-native-elevated-view';
import { strings } from '../../../../locales/i18n';
import { baseStyles } from '../../../styles/common';
import { useDispatch, useSelector } from 'react-redux';
import { backUpSeedphraseAlertNotVisible } from '../../../actions/user';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import { MetaMetricsEvents } from '../../../core/Analytics';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  NOTIFICATION_REMIND_ME_LATER_BUTTON_ID,
  SECURE_WALLET_BACKUP_ALERT_MODAL,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import styleSheet from './BackupAlert.styles';
import { useStyles } from '../../../component-library/hooks';
import { BackupAlertI } from './BackupAlert.types';
import { PROTECT_WALLET_BUTTON } from './BackupAlert.constants';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useMetrics } from '../../../components/hooks/useMetrics';

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
  const { trackEvent } = useMetrics();
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

    trackEvent(MetaMetricsEvents.WALLET_SECURITY_PROTECT_ENGAGED, {
      wallet_protection_required: false,
      source: 'Backup Alert',
    });
  };

  const onDismissAlert = () => {
    dispatch(backUpSeedphraseAlertNotVisible());

    trackEvent(MetaMetricsEvents.WALLET_SECURITY_PROTECT_DISMISSED, {
      wallet_protection_required: false,
      source: 'Backup Alert',
    });

    if (onDismiss) onDismiss();
  };

  const shouldNotRenderAlert =
    seedphraseBackedUp ||
    inBlockedView ||
    !backUpSeedphraseVisible ||
    onboardingWizardStep !== 0 ||
    !isVisible;

  return shouldNotRenderAlert ? null : (
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
            <Icon
              size={IconSize.Md}
              name={IconName.Notification}
              color={IconColor.Default}
            />
          </View>
          <View style={baseStyles.flexGrow}>
            <Text
              variant={TextVariant.BodyMDBold}
              style={styles.backupAlertTitle}
            >
              {strings('backup_alert.title')}
            </Text>
            <View style={styles.buttonsWrapper}>
              <TouchableOpacity
                onPress={goToBackupFlow}
                testID={PROTECT_WALLET_BUTTON}
              >
                <Text
                  variant={TextVariant.BodyMDBold}
                  style={styles.backupAlertMessage}
                >
                  {strings('backup_alert.right_button')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDismissAlert}
                style={styles.dismissButton}
              >
                <Text
                  variant={TextVariant.BodyMD}
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
