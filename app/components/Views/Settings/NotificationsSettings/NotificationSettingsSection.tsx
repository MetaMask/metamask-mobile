import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { ScrollView, Switch, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './NotificationsSettings.styles';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import {
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import {
  useNotificationStoragePreferences,
  type NotificationStoragePreferenceSection,
  type NotificationStoragePreferenceChannelKey,
} from './hooks/useNotificationStoragePreferences';
import { AccountsList } from './AccountsList';
import { strings } from '../../../../../locales/i18n';
import SocialAINotificationPreferencesContent from './SocialAINotificationPreferencesContent';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import Routes from '../../../../constants/navigation/Routes';
import { useWalletActivityAccountSelection } from './AccountsList.hooks';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { NotificationChannel } from '../../../../core/Analytics/events/channels';
import { useSessionProfileId } from '../../../../util/notifications/hooks/useSessionProfileId';

type NotificationSettingsStyles = ReturnType<typeof styleSheet>;

interface SectionContentProps {
  styles: NotificationSettingsStyles;
}

const SETTINGS_TYPE_BY_SECTION: Record<
  NotificationStoragePreferenceSection,
  string
> = {
  walletActivity: 'wallet_activity',
  perps: 'perps',
  socialAI: 'social_ai',
  marketing: 'marketing',
};

const WalletActivitySectionContent = ({ styles }: SectionContentProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { profileId } = useSessionProfileId();
  const { preferences, updatePreferencesSection } =
    useNotificationStoragePreferences();
  const {
    accountProps,
    notificationAccountListProps,
    hasEnabledAccount,
    hasNotificationAccounts,
    isUpdatingAllAccounts,
    toggleAllAccounts,
  } = useWalletActivityAccountSelection();

  // TODO: validate behaviour with chris, also propose not emitting an event here at all as this change is a second-order effect
  // TODO: validate if we should emit an event if updating preferences fail - user still tried to set them
  // Selecting/deselecting all accounts also flips both notification channels
  // for wallet activity and reports it as a single ALL-channel update. Both
  // channels are written in one section update so they don't race and clobber
  // each other through the shared (stale) preferences snapshot.
  const handleToggleAllAccounts = useCallback(async () => {
    const nextEnabled = !hasEnabledAccount;

    await toggleAllAccounts();

    if (preferences) {
      await updatePreferencesSection('walletActivity', {
        ...preferences.walletActivity,
        pushNotificationsEnabled: nextEnabled,
        inAppNotificationsEnabled: nextEnabled,
      });
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
        .addProperties({
          settings_type: SETTINGS_TYPE_BY_SECTION.walletActivity,
          notification_channel: NotificationChannel.ALL,
          enabled: nextEnabled,
          ...(profileId ? { profile_id: profileId } : {}),
        })
        .build(),
    );
  }, [
    hasEnabledAccount,
    toggleAllAccounts,
    preferences,
    updatePreferencesSection,
    trackEvent,
    createEventBuilder,
    profileId,
  ]);

  return (
    <>
      <View style={styles.line} />
      <View style={styles.setting}>
        <View style={styles.walletActivityHeader}>
          <Text
            color={TextColor.TextDefault}
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Medium}
          >
            {strings('app_settings.notifications_opts.select_accounts_title')}
          </Text>
          {hasNotificationAccounts ? (
            <TouchableOpacity
              onPress={handleToggleAllAccounts}
              disabled={isUpdatingAllAccounts}
              accessibilityRole="button"
              style={styles.selectAllButton}
              testID={
                NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATIONS_SELECT_ALL
              }
            >
              <Text
                color={
                  isUpdatingAllAccounts
                    ? TextColor.TextMuted
                    : TextColor.PrimaryDefault
                }
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
              >
                {strings(
                  hasEnabledAccount
                    ? 'app_settings.notifications_opts.deselect_all'
                    : 'app_settings.notifications_opts.select_all',
                )}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
          {strings('app_settings.notifications_opts.select_accounts_desc')}
        </Text>
      </View>
      <AccountsList
        accountProps={accountProps}
        notificationAccountListProps={notificationAccountListProps}
      />
    </>
  );
};

const SocialAISectionContent = ({ styles }: SectionContentProps) => (
  <>
    <View style={styles.line} />
    <SocialAINotificationPreferencesContent
      showPushToggle={false}
      withHorizontalPadding={false}
    />
  </>
);

const MarketingSectionContent = ({ styles }: SectionContentProps) => (
  <View style={styles.marketingDisclaimer}>
    <Text
      color={TextColor.TextAlternative}
      variant={TextVariant.BodySm}
      style={styles.marketingDisclaimerText}
    >
      {strings('app_settings.notifications_opts.marketing_disclaimer')}
    </Text>
  </View>
);

const SECTION_CONTENT_BY_TYPE: Partial<
  Record<
    NotificationStoragePreferenceSection,
    React.ComponentType<SectionContentProps>
  >
> = {
  walletActivity: WalletActivitySectionContent,
  socialAI: SocialAISectionContent,
  marketing: MarketingSectionContent,
};

export interface NotificationSettingsSectionProps {
  navigation: NavigationProp<ParamListBase>;
  route: RouteProp<
    {
      params: {
        type: NotificationStoragePreferenceSection;
        title: string;
        description: string;
      };
    },
    'params'
  >;
}

const NotificationSettingsSection = ({
  navigation,
  route,
}: NotificationSettingsSectionProps) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const { type, title, description } = route.params;
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { profileId } = useSessionProfileId();

  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const { preferences, updatePreference } = useNotificationStoragePreferences();

  const trackChannelUpdate = useCallback(
    (channel: NotificationChannel, enabled: boolean) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
          .addProperties({
            settings_type: SETTINGS_TYPE_BY_SECTION[type],
            notification_channel: channel,
            enabled,
            ...(profileId ? { profile_id: profileId } : {}),
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder, type, profileId],
  );

  const handleToggleChannel = useCallback(
    async (
      key: NotificationStoragePreferenceChannelKey,
      channel: NotificationChannel,
      currentValue: boolean,
    ) => {
      const nextEnabled = !currentValue;

      await updatePreference(type, key, nextEnabled);

      trackChannelUpdate(channel, nextEnabled);
    },
    [updatePreference, trackChannelUpdate, type],
  );

  useEffect(() => {
    if (!isMetamaskNotificationsEnabled) {
      navigation.dispatch(StackActions.replace(Routes.SETTINGS.NOTIFICATIONS));
    }
  }, [isMetamaskNotificationsEnabled, navigation]);

  if (!isMetamaskNotificationsEnabled || !preferences) {
    return null;
  }

  const sectionPrefs = preferences[type];
  const SectionContent = SECTION_CONTENT_BY_TYPE[type];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <HeaderCompactStandard
        title={strings('app_settings.notifications_title')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.setting}>
          <Text color={TextColor.TextDefault} variant={TextVariant.HeadingLg}>
            {title}
          </Text>
          <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
            {description}
          </Text>
        </View>

        <View style={styles.switchElement}>
          <Text
            color={TextColor.TextDefault}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
          >
            {strings('app_settings.notifications_opts.push_recommended')}
          </Text>
          <Switch
            value={sectionPrefs.pushNotificationsEnabled}
            onChange={() =>
              handleToggleChannel(
                'pushNotificationsEnabled',
                NotificationChannel.PUSH,
                sectionPrefs.pushNotificationsEnabled,
              )
            }
            trackColor={{
              true: theme.colors.primary.default,
              false: theme.colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={theme.colors.border.muted}
          />
        </View>

        <View style={styles.switchElement}>
          <Text
            color={TextColor.TextDefault}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
          >
            {strings('app_settings.notifications_opts.in_app')}
          </Text>
          <Switch
            value={sectionPrefs.inAppNotificationsEnabled}
            onChange={() =>
              handleToggleChannel(
                'inAppNotificationsEnabled',
                NotificationChannel.IN_APP,
                sectionPrefs.inAppNotificationsEnabled,
              )
            }
            trackColor={{
              true: theme.colors.primary.default,
              false: theme.colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={theme.colors.border.muted}
          />
        </View>

        {SectionContent ? <SectionContent styles={styles} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationSettingsSection;
