/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import ElevatedView from 'react-native-elevated-view';
import { strings } from '../../../../locales/i18n';
import { baseStyles } from '../../../styles/common';
import { useDispatch, useSelector } from 'react-redux';
import { backUpSeedphraseAlertNotVisible } from '../../../actions/user';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { ProtectWalletModalSelectorsIDs } from '../ProtectYourWalletModal/ProtectWalletModal.testIds';
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
import Routes from '../../../constants/navigation/Routes';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import { RootState } from '../../../reducers';

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
  const { trackEvent, createEventBuilder } = useMetrics();
  const [inBrowserView, setInBrowserView] = useState(false);
  const [inBlockedView, setInBlockedView] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const { seedphraseBackedUp, backUpSeedphraseVisible } = useSelector(
    (state: RootState) => state.user,
  );

  const dispatch = useDispatch();

  const currentRouteName = findRouteNameFromNavigatorState(
    navigation.dangerouslyGetState().routes,
  );

  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );

  useEffect(() => {
    const isInBrowserView = currentRouteName === BROWSER_ROUTE;
    const blockedView =
      BLOCKED_LIST.find((path) => currentRouteName?.includes(path)) ??
      currentRouteName === Routes.SET_PASSWORD_FLOW.ROOT;

    setInBrowserView(isInBrowserView);
    setInBlockedView(!!blockedView);
  }, [currentRouteName]);

  const goToBackupFlow = () => {
    setIsVisible(false);
    navigation.navigate(Routes.SET_PASSWORD_FLOW.ROOT, {
      screen: Routes.SET_PASSWORD_FLOW.MANUAL_BACKUP_STEP_1,
      params: { backupFlow: true },
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_SECURITY_PROTECT_ENGAGED)
        .addProperties({
          wallet_protection_required: false,
          source: 'Backup Alert',
        })
        .build(),
    );
  };

  const onDismissAlert = () => {
    dispatch(backUpSeedphraseAlertNotVisible());

    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_SECURITY_PROTECT_DISMISSED)
        .addProperties({
          wallet_protection_required: false,
          source: 'Backup Alert',
        })
        .build(),
    );

    if (onDismiss) onDismiss();
  };

  const shouldNotRenderAlert =
    seedphraseBackedUp ||
    inBlockedView ||
    !backUpSeedphraseVisible ||
    !isVisible;

  return shouldNotRenderAlert || isSeedlessOnboardingLoginFlow ? null : (
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
          testID={ProtectWalletModalSelectorsIDs.COLLAPSED_WALLET_MODAL}
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
                  testID={ProtectWalletModalSelectorsIDs.REMIND_ME_LATER_BUTTON}
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
