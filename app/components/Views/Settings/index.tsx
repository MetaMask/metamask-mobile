import React, { useCallback } from 'react';

import { StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import SettingsDrawer from '../../UI/SettingsDrawer';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { Colors } from '../../../util/theme/models';
import { SettingsViewSelectorsIDs } from './SettingsView.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createSnapsSettingsListNavDetails } from '../Snaps/SnapsSettingsList/SnapsSettingsList';
import { navigateWithDetails } from '../../../util/navigation/navUtils';
import { CAN_INSTALL_THIRD_PARTY_SNAPS } from '../../../constants/snaps';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import { isTestEnvironment } from '../../../util/test/utils';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../selectors/featureFlagController/glassHeaders';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      zIndex: 99999999999999,
    },
  });

const Settings = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const tw = useTailwind();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const styles = createStyles(colors);
  const navigation = useNavigation<AppNavigationProp>();

  const seedphraseBackedUp = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.user.seedphraseBackedUp,
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onPressGeneral = () => {
    trackEvent(createEventBuilder(MetaMetricsEvents.SETTINGS_GENERAL).build());
    navigation.navigate('GeneralSettings');
  };

  const onPressAdvanced = () => {
    trackEvent(createEventBuilder(MetaMetricsEvents.SETTINGS_ADVANCED).build());
    navigation.navigate('AdvancedSettings');
  };

  const onPressNotifications = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_NOTIFICATIONS).build(),
    );
    navigation.navigate(Routes.SETTINGS.NOTIFICATIONS);
  };

  const onPressBackupAndSync = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_BACKUP_AND_SYNC).build(),
    );
    navigation.navigate(Routes.SETTINGS.BACKUP_AND_SYNC);
  };

  const onPressSecurity = () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SETTINGS_SECURITY_AND_PRIVACY,
      ).build(),
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.VIEW_SECURITY_SETTINGS).build(),
    );
    navigation.navigate('SecuritySettings');
  };

  const onPressOnRamp = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONRAMP_SETTINGS_CLICKED).build(),
    );
    navigation.navigate(Routes.RAMP.SETTINGS);
  };

  const onPressExperimental = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SETTINGS_EXPERIMENTAL).build(),
    );
    navigation.navigate('ExperimentalSettings');
  };

  const onPressAesCryptoTestForm = () => {
    navigation.navigate('AesCryptoTestForm');
  };

  const onPressDeveloperOptions = () => {
    navigation.navigate('DeveloperOptions');
  };
  const onPressPasswordlessRecoveryDeveloperOptions = () => {
    navigation.navigate(
      Routes.SETTINGS.PASSWORDLESS_RECOVERY_DEVELOPER_OPTIONS,
    );
  };
  const onPressFeatureFlagOverride = () => {
    navigation.navigate(Routes.FEATURE_FLAG_OVERRIDE);
  };

  const onPressSnaps = () => {
    navigateWithDetails(navigation, createSnapsSettingsListNavDetails());
  };

  const oauthFlow = useSelector(selectSeedlessOnboardingLoginFlow);

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        title={strings('app_settings.title')}
        onBack={handleBack}
        backButtonProps={{ testID: SettingsViewSelectorsIDs.BACK_BUTTON }}
        testID={SettingsViewSelectorsIDs.SETTINGS_HEADER}
        includesTopInset
      />
      <ScrollView
        style={styles.wrapper}
        testID={SettingsViewSelectorsIDs.SETTINGS_SCROLL_ID}
      >
        <Box
          style={tw.style('px-4 py-3')}
          testID={SettingsViewSelectorsIDs.GROUP_GENERAL}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('app_settings.groups.general')}
          </Text>
        </Box>
        <SettingsDrawer
          onPress={onPressGeneral}
          title={strings('app_settings.preferences_and_display_title')}
          testID={SettingsViewSelectorsIDs.GENERAL}
        />
        {isNotificationsFeatureEnabled() && (
          <SettingsDrawer
            onPress={onPressNotifications}
            title={strings('app_settings.notifications_title')}
            testID={SettingsViewSelectorsIDs.NOTIFICATIONS}
          />
        )}

        <SectionDivider marginVertical={1} twClassName="mx-4" />
        <Box
          style={tw.style('px-4 py-3')}
          testID={SettingsViewSelectorsIDs.GROUP_SECURITY_AND_PRIVACY}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('app_settings.groups.security_and_privacy')}
          </Text>
        </Box>
        <SettingsDrawer
          onPress={onPressSecurity}
          title={strings('app_settings.security_title')}
          warning={
            !oauthFlow && !seedphraseBackedUp
              ? strings('drawer.settings_warning')
              : ''
          }
          testID={SettingsViewSelectorsIDs.SECURITY}
        />
        <SettingsDrawer
          onPress={onPressBackupAndSync}
          title={strings('backupAndSync.title')}
          testID={SettingsViewSelectorsIDs.BACKUP_AND_SYNC}
        />

        <SectionDivider marginVertical={1} twClassName="mx-4" />
        <Box
          style={tw.style('px-4 py-3')}
          testID={SettingsViewSelectorsIDs.GROUP_TRANSACTIONS_AND_ASSETS}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('app_settings.groups.transactions_and_assets')}
          </Text>
        </Box>
        <SettingsDrawer
          title={strings('app_settings.fiat_on_ramp.title')}
          onPress={onPressOnRamp}
          testID={SettingsViewSelectorsIDs.ON_RAMP}
        />

        <SectionDivider marginVertical={1} twClassName="mx-4" />
        <Box
          style={tw.style('px-4 py-3')}
          testID={SettingsViewSelectorsIDs.GROUP_MORE}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('app_settings.groups.more')}
          </Text>
        </Box>
        <SettingsDrawer
          onPress={onPressAdvanced}
          title={strings('app_settings.advanced_title')}
          testID={SettingsViewSelectorsIDs.ADVANCED}
        />
        {CAN_INSTALL_THIRD_PARTY_SNAPS && (
          <SettingsDrawer
            title={strings('app_settings.snaps.title')}
            onPress={onPressSnaps}
            testID={SettingsViewSelectorsIDs.SNAPS}
          />
        )}
        <SettingsDrawer
          title={strings('app_settings.experimental_title')}
          onPress={onPressExperimental}
          testID={SettingsViewSelectorsIDs.EXPERIMENTAL}
        />
        {
          /**
           * This drawer is only visible in test mode.
           * It is used to test the AES crypto functions.
           *
           * If this is shown in production, it is a bug.
           */
          isTestEnvironment && (
            <SettingsDrawer
              title={strings('app_settings.aes_crypto_test_form_title')}
              onPress={onPressAesCryptoTestForm}
              testID={SettingsViewSelectorsIDs.AES_CRYPTO_TEST_FORM}
            />
          )
        }
        {process.env.MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS === 'true' && (
          <SettingsDrawer
            title={strings('app_settings.developer_options.title')}
            onPress={onPressDeveloperOptions}
            testID={SettingsViewSelectorsIDs.DEVELOPER_OPTIONS}
          />
        )}
        {/* Passwordless recovery setup for MFA/dev builds — no full Developer Options flag needed. */}
        {isMfaDevBuild() && (
          <SettingsDrawer
            title={strings(
              'app_settings.developer_options.passwordless_recovery.title',
            )}
            onPress={onPressPasswordlessRecoveryDeveloperOptions}
            testID={
              SettingsViewSelectorsIDs.PASSWORDLESS_RECOVERY_DEVELOPER_OPTIONS
            }
          />
        )}
        {process.env.METAMASK_ENVIRONMENT !== 'production' && (
          <SettingsDrawer
            title={strings('app_settings.feature_flag_override.title')}
            onPress={onPressFeatureFlagOverride}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
