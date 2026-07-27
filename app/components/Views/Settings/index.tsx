import React, { ReactNode, useCallback, useMemo } from 'react';
import {
  ActionListItem,
  Box,
  BoxFlexDirection,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { Colors } from '../../../util/theme/models';
import { SettingsViewSelectorsIDs } from './SettingsView.testIds';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createSnapsSettingsListNavDetails } from '../Snaps/SnapsSettingsList/SnapsSettingsList';
import { navigateWithDetails } from '../../../util/navigation/navUtils';
import { CAN_INSTALL_THIRD_PARTY_SNAPS } from '../../../constants/snaps';
///: END:ONLY_INCLUDE_IF
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import { isTestEnvironment } from '../../../util/test/utils';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';

interface SettingsRowProps {
  title: string;
  description?: string;
  iconName: IconName;
  onPress: () => void;
  testID?: string;
  warning?: string;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      zIndex: 99999999999999,
    },
  });

const Settings = () => {
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
  const onPressFeatureFlagOverride = () => {
    navigation.navigate(Routes.FEATURE_FLAG_OVERRIDE);
  };

  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  const onPressSnaps = () => {
    navigateWithDetails(navigation, createSnapsSettingsListNavDetails());
  };
  ///: END:ONLY_INCLUDE_IF

  const oauthFlow = useSelector(selectSeedlessOnboardingLoginFlow);

  const separator = useMemo(
    () => (
      <Box
        style={tw.style('h-px my-2 mx-4', {
          backgroundColor: colors.border.muted,
          opacity: 0.75,
        })}
      />
    ),
    [colors.border.muted, tw],
  );

  const arrowRightIcon = useMemo(
    () => (
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    ),
    [],
  );

  const renderSectionHeader = useCallback(
    (title: string) => (
      <Box style={tw.style('px-4 pt-3 pb-2')}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {title}
        </Text>
      </Box>
    ),
    [tw],
  );

  const renderWarning = useCallback(
    (warning: string) => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        style={tw.style('self-start items-center mt-2 px-2 py-1 rounded-full', {
          backgroundColor: colors.error.muted,
        })}
      >
        <Icon
          name={IconName.Danger}
          size={IconSize.Sm}
          color={IconColor.ErrorDefault}
        />
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          style={tw.style('ml-1')}
        >
          {warning}
        </Text>
      </Box>
    ),
    [colors.error.muted, tw],
  );

  const SettingsRow = useCallback(
    ({
      title,
      description,
      iconName,
      onPress,
      testID,
      warning,
    }: SettingsRowProps) => {
      let descriptionContent: string | ReactNode | undefined = description;

      if (warning) {
        descriptionContent = (
          <>
            {description ? (
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {description}
              </Text>
            ) : null}
            {renderWarning(warning)}
          </>
        );
      }

      return (
        <ActionListItem
          startAccessory={
            <Icon
              name={iconName}
              size={IconSize.Lg}
              color={IconColor.IconDefault}
            />
          }
          label={title}
          description={descriptionContent}
          endAccessory={arrowRightIcon}
          onPress={onPress}
          testID={testID}
        />
      );
    },
    [arrowRightIcon, renderWarning],
  );

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderStandard
        title={strings('app_settings.title')}
        onBack={handleBack}
        backButtonProps={{ testID: SettingsViewSelectorsIDs.BACK_BUTTON }}
        testID={SettingsViewSelectorsIDs.SETTINGS_HEADER}
        includesTopInset
      />
      <ScrollView
        style={styles.wrapper}
        contentContainerStyle={tw.style('pb-6')}
        testID={SettingsViewSelectorsIDs.SETTINGS_SCROLL_ID}
      >
        {renderSectionHeader(strings('accounts_menu.manage'))}
        <SettingsRow
          description={strings('app_settings.general_desc')}
          iconName={IconName.Setting}
          onPress={onPressGeneral}
          title={strings('app_settings.general_title')}
          testID={SettingsViewSelectorsIDs.GENERAL}
        />
        <SettingsRow
          description={strings('app_settings.security_desc')}
          iconName={IconName.SecurityTick}
          onPress={onPressSecurity}
          title={strings('app_settings.security_title')}
          warning={
            !oauthFlow && !seedphraseBackedUp
              ? strings('drawer.settings_warning')
              : ''
          }
          testID={SettingsViewSelectorsIDs.SECURITY}
        />
        <SettingsRow
          description={strings('app_settings.advanced_desc')}
          iconName={IconName.Speedometer}
          onPress={onPressAdvanced}
          title={strings('app_settings.advanced_title')}
          testID={SettingsViewSelectorsIDs.ADVANCED}
        />
        <SettingsRow
          description={strings('backupAndSync.description')}
          iconName={IconName.Refresh}
          onPress={onPressBackupAndSync}
          title={strings('backupAndSync.title')}
          testID={SettingsViewSelectorsIDs.BACKUP_AND_SYNC}
        />

        {separator}

        {renderSectionHeader(strings('accounts_menu.resources'))}
        {isNotificationsFeatureEnabled() && (
          <SettingsRow
            description={strings('app_settings.notifications_desc')}
            iconName={IconName.Notification}
            onPress={onPressNotifications}
            title={strings('app_settings.notifications_title')}
            testID={SettingsViewSelectorsIDs.NOTIFICATIONS}
          />
        )}
        {
          ///: BEGIN:ONLY_INCLUDE_IF(snaps)
        }
        {CAN_INSTALL_THIRD_PARTY_SNAPS && (
          <SettingsRow
            title={strings('app_settings.snaps.title')}
            description={strings('app_settings.snaps.description')}
            iconName={IconName.Plug}
            onPress={onPressSnaps}
            testID={SettingsViewSelectorsIDs.SNAPS}
          />
        )}
        {
          ///: END:ONLY_INCLUDE_IF
        }
        <SettingsRow
          title={strings('app_settings.fiat_on_ramp.title')}
          description={strings('app_settings.fiat_on_ramp.description')}
          iconName={IconName.BuySell}
          onPress={onPressOnRamp}
          testID={SettingsViewSelectorsIDs.ON_RAMP}
        />

        {separator}

        {renderSectionHeader(strings('app_settings.experimental_title'))}
        <SettingsRow
          title={strings('app_settings.experimental_title')}
          description={strings('app_settings.experimental_desc')}
          iconName={IconName.Sparkle}
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
            <SettingsRow
              title={strings('app_settings.aes_crypto_test_form_title')}
              description={strings(
                'app_settings.aes_crypto_test_form_description',
              )}
              iconName={IconName.Key}
              onPress={onPressAesCryptoTestForm}
              testID={SettingsViewSelectorsIDs.AES_CRYPTO_TEST_FORM}
            />
          )
        }
        {process.env.MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS === 'true' && (
          <SettingsRow
            title={strings('app_settings.developer_options.title')}
            iconName={IconName.Details}
            onPress={onPressDeveloperOptions}
          />
        )}
        {process.env.METAMASK_ENVIRONMENT !== 'production' && (
          <SettingsRow
            title={strings('app_settings.feature_flag_override.title')}
            description={strings(
              'app_settings.feature_flag_override.description',
            )}
            iconName={IconName.Data}
            onPress={onPressFeatureFlagOverride}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
