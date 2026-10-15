import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import { selectLockTime } from '../../../../selectors/settings';
import { strings } from '../../../../../locales/i18n';
import AUTO_LOCK_OPTIONS from './Sections/AutoLock/constants';
import { SecurityPrivacyViewSelectorsIDs } from './SecurityPrivacyView.testIds';
import { useTheme } from '../../../../util/theme';
import { SecurityOptionToggle } from '../../../UI/SecurityOptionToggle';
import { useMoneyFinishSetup } from '../../../UI/Money/hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../../UI/Money/hooks/useMoneySecurityMethods';

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: { height: 52, paddingHorizontal: 4 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  title: { marginTop: 8, marginBottom: 14 },
  row: {
    minHeight: 58,
    paddingVertical: 8,
  },
  rowContent: { flex: 1 },
  rowAccessory: { gap: 12 },
  recoveryRow: { marginBottom: 10 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deviceAuthentication: { marginVertical: 2 },
  deviceAuthenticationDescription: {
    marginTop: 6,
    lineHeight: 24,
  },
});

interface SettingsRowProps {
  title: string;
  value?: string;
  badge?: string;
  onPress?: () => void;
  testID?: string;
}

const SettingsRow = ({
  title,
  value,
  badge,
  onPress,
  testID,
}: SettingsRowProps) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole={onPress ? 'button' : undefined}
    testID={testID}
  >
    <Box
      style={styles.row}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
    >
      <Box style={styles.rowContent}>
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
        {badge ? (
          <Box style={styles.badge} twClassName="bg-error-muted">
            <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
              {badge}
            </Text>
          </Box>
        ) : null}
      </Box>
      <Box
        style={styles.rowAccessory}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {value ? (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {value}
          </Text>
        ) : null}
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
    </Box>
  </Pressable>
);

const PrototypeSecuritySettings = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();
  const seedphraseBackedUp = useSelector(
    (state: RootState) => state.user.seedphraseBackedUp,
  );
  const lockTime = useSelector(selectLockTime);
  const { isEmailVerified, passkeyCount } = useMoneyFinishSetup();
  const {
    isAuthenticatorAdded,
    isSmsAdded,
    isTransactionVerificationEnabled,
    setTransactionVerificationEnabled,
  } = useMoneySecurityMethods(passkeyCount);
  const autoLockLabel =
    AUTO_LOCK_OPTIONS.find((option) => option.value === lockTime.toString())
      ?.label ?? strings('app_settings.autolock_after', { time: 30 });

  const handleTransactionVerificationChange = useCallback(
    (enabled: boolean) => {
      if (!enabled && isTransactionVerificationEnabled) {
        navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.SECURITY_INFO_SHEET,
          params: {
            variant: 'disable-transaction-verification',
            returnToPrevious: true,
          },
        });
        return;
      }

      if (enabled && !isTransactionVerificationEnabled) {
        const hasVerificationMethod =
          passkeyCount > 0 ||
          isEmailVerified ||
          isAuthenticatorAdded ||
          isSmsAdded;

        if (hasVerificationMethod) {
          navigation.navigate(Routes.MONEY.MODALS.ROOT, {
            screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
            params: {
              action: {
                type: 'enable-transaction-verification',
                returnToPrevious: true,
              },
            },
          });
        } else {
          navigation.navigate(Routes.MONEY.MODALS.ROOT, {
            screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
            params: { returnToMoneyHome: false },
          });
        }
        return;
      }

      setTransactionVerificationEnabled(enabled);
    },
    [
      isAuthenticatorAdded,
      isEmailVerified,
      isSmsAdded,
      isTransactionVerificationEnabled,
      navigation,
      passkeyCount,
      setTransactionVerificationEnabled,
    ],
  );

  return (
    <SafeAreaView
      style={[styles.wrapper, { backgroundColor: colors.background.default }]}
    >
      <Box style={styles.header} justifyContent={BoxJustifyContent.Center}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => navigation.goBack()}
          accessibilityLabel={strings('navigation.back')}
          testID="security-password-back"
        />
      </Box>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID={SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL}
      >
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          style={styles.title}
        >
          {strings('app_settings.security_password_title')}
        </Text>
        <Box style={styles.recoveryRow}>
          <SettingsRow
            title={strings('app_settings.manage_wallet_recovery')}
            badge={
              seedphraseBackedUp
                ? undefined
                : strings('app_settings.back_up_incomplete')
            }
            onPress={() => navigation.navigate('WalletRecovery')}
            testID="manage-wallet-recovery"
          />
        </Box>
        <Box style={styles.deviceAuthentication}>
          <SecurityOptionToggle
            title={strings('app_settings.device_authentication')}
            description={strings(
              'app_settings.enable_device_authentication_desc',
            )}
            value={isTransactionVerificationEnabled}
            onOptionUpdated={handleTransactionVerificationChange}
            testId={SecurityPrivacyViewSelectorsIDs.DEVICE_SECURITY_TOGGLE}
            descriptionVariant={TextVariant.BodyMd}
            descriptionFontWeight={FontWeight.Regular}
            descriptionStyle={styles.deviceAuthenticationDescription}
          />
        </Box>
        <SettingsRow
          title={strings('password_reset.password_title')}
          onPress={() => navigation.navigate(Routes.SETTINGS.CHANGE_PASSWORD)}
          testID={SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER}
        />
        <SettingsRow
          title={strings('app_settings.two_step_verification')}
          onPress={() => navigation.navigate(Routes.MONEY.MANAGE_SECURITY)}
          testID="two-step-verification"
        />
        <SettingsRow
          title={strings('app_settings.auto_lock')}
          value={autoLockLabel}
          testID="auto-lock-row"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrototypeSecuritySettings;
