import React, { useCallback, useMemo } from 'react';
import { ScrollView, Switch, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './NotificationsSettings.styles';
import {
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import {
  useNotificationStoragePreferences,
  type NotificationPreferenceSection,
} from './hooks/useNotificationStoragePreferences';
import { AccountsList } from './AccountsList';
import { strings } from '../../../../../locales/i18n';
import SocialAINotificationPreferencesContent from './SocialAINotificationPreferencesContent';
import { useWalletActivityAccountSelection } from './AccountsList.hooks';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { NotificationChannel } from '../../../../core/Analytics/events/channels';
import Logger from '../../../../util/Logger';
import { useOptimisticToggleValue } from './hooks/useOptimisticToggleValue';

type NotificationSettingsStyles = ReturnType<typeof styleSheet>;

interface SectionContentProps {
  styles: NotificationSettingsStyles;
  /** When true, greys out and disables all interactive content in the section. */
  disabled?: boolean;
}

interface ListSectionContentProps extends SectionContentProps {
  ListHeaderComponent: React.ReactElement;
}

type SectionDefinition =
  | {
      layout: 'scroll';
      Content?: React.ComponentType<SectionContentProps>;
    }
  | {
      layout: 'list';
      Content: React.ComponentType<ListSectionContentProps>;
    };

const SETTINGS_TYPE_BY_SECTION: Record<NotificationPreferenceSection, string> =
  {
    walletActivity: 'wallet_activity',
    perps: 'perps',
    agenticCli: 'agentic_cli',
    socialAI: 'social_ai',
    marketing: 'marketing',
    priceAlerts: 'price_alerts',
  };

const WalletActivitySectionContent = ({
  styles,
  disabled = false,
  ListHeaderComponent,
}: ListSectionContentProps) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const {
    accountProps,
    notificationAccountListProps,
    hasEnabledAccount,
    hasNotificationAccounts,
    isUpdatingAllAccounts,
    toggleAllAccounts,
  } = useWalletActivityAccountSelection();

  // Account subscriptions live in the Trigger API, so toggling every account
  // is a `toggleAllAccounts` call and nothing else — there are no
  // wallet-activity channel toggles left to flip.
  const handleToggleAllAccounts = useCallback(async () => {
    const nextEnabled = !hasEnabledAccount;

    await toggleAllAccounts();

    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
        .addProperties({
          settings_type: SETTINGS_TYPE_BY_SECTION.walletActivity,
          notification_channel: NotificationChannel.ALL,
          enabled: nextEnabled,
        })
        .build(),
    );
  }, [hasEnabledAccount, toggleAllAccounts, trackEvent, createEventBuilder]);

  const accountsListHeader = useMemo(
    () => (
      <View>
        {ListHeaderComponent}
        <View style={disabled ? styles.disabledContent : undefined}>
          <View style={styles.lineSpacer} />
          <View style={styles.setting}>
            <View style={styles.walletActivityHeader}>
              <Text
                color={TextColor.TextDefault}
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Medium}
              >
                {strings(
                  'app_settings.notifications_opts.select_accounts_title',
                )}
              </Text>
              {hasNotificationAccounts ? (
                <TouchableOpacity
                  onPress={handleToggleAllAccounts}
                  disabled={disabled || isUpdatingAllAccounts}
                  accessibilityRole="button"
                  style={styles.selectAllButton}
                  testID={
                    NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATIONS_SELECT_ALL
                  }
                >
                  <Text
                    color={
                      disabled || isUpdatingAllAccounts
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
            <Text
              color={TextColor.TextAlternative}
              variant={TextVariant.BodyMd}
            >
              {strings('app_settings.notifications_opts.select_accounts_desc')}
            </Text>
            {notificationAccountListProps.accountSettingsError ? (
              <Text
                color={TextColor.ErrorDefault}
                variant={TextVariant.BodySm}
                style={styles.accountsLoadError}
              >
                {strings('app_settings.notifications_opts.accounts_load_error')}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    ),
    [
      ListHeaderComponent,
      disabled,
      handleToggleAllAccounts,
      hasEnabledAccount,
      hasNotificationAccounts,
      isUpdatingAllAccounts,
      notificationAccountListProps.accountSettingsError,
      styles,
    ],
  );

  return (
    <AccountsList
      accountProps={accountProps}
      notificationAccountListProps={notificationAccountListProps}
      disabled={disabled}
      ListHeaderComponent={accountsListHeader}
    />
  );
};

const SocialAISectionContent = ({
  styles,
  disabled = false,
}: SectionContentProps) => (
  <>
    <View style={styles.line} />
    <SocialAINotificationPreferencesContent
      showPushToggle={false}
      withHorizontalPadding={false}
      disabled={disabled}
    />
  </>
);

const MarketingSectionContent = ({
  styles,
  disabled = false,
}: SectionContentProps) => (
  <View style={styles.marketingDisclaimer}>
    <Text
      color={disabled ? TextColor.TextMuted : TextColor.TextAlternative}
      variant={TextVariant.BodySm}
      style={styles.marketingDisclaimerText}
    >
      {strings('app_settings.notifications_opts.marketing_disclaimer')}
    </Text>
  </View>
);

const SECTION_DEFINITIONS: Record<
  NotificationPreferenceSection,
  SectionDefinition
> = {
  walletActivity: {
    layout: 'list',
    Content: WalletActivitySectionContent,
  },
  socialAI: {
    layout: 'scroll',
    Content: SocialAISectionContent,
  },
  marketing: {
    layout: 'scroll',
    Content: MarketingSectionContent,
  },
  perps: { layout: 'scroll' },
  agenticCli: { layout: 'scroll' },
  priceAlerts: { layout: 'scroll' },
};

export interface NotificationSettingsSectionContentProps {
  type: NotificationPreferenceSection;
  title?: string;
  description?: string;
  disabled?: boolean;
}

export const NotificationSettingsSectionContent = ({
  type,
  title,
  description,
  disabled,
}: NotificationSettingsSectionContentProps) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { preferences, updateSectionChannel } =
    useNotificationStoragePreferences();
  const sectionPrefs = preferences?.[type];
  const sectionDefinition = SECTION_DEFINITIONS[type];

  const trackChannelUpdate = useCallback(
    (channel: NotificationChannel, enabled: boolean) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
          .addProperties({
            settings_type: SETTINGS_TYPE_BY_SECTION[type],
            notification_channel: channel,
            enabled,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder, type],
  );

  const persistPush = useCallback(
    async (v: boolean) => {
      try {
        await updateSectionChannel(type, 'pushNotificationsEnabled', v);
        trackChannelUpdate(NotificationChannel.PUSH, v);
      } catch (e) {
        Logger.error(
          new Error('Failed to update notification section channel'),
          {
            message:
              'NotificationSettingsSectionContent: update channel failed',
            type,
            channel: 'pushNotificationsEnabled',
            nextValue: v,
          },
        );
        throw e;
      }
    },
    [updateSectionChannel, type, trackChannelUpdate],
  );

  const persistInApp = useCallback(
    async (v: boolean) => {
      try {
        await updateSectionChannel(type, 'inAppNotificationsEnabled', v);
        trackChannelUpdate(NotificationChannel.IN_APP, v);
      } catch (e) {
        Logger.error(
          new Error('Failed to update notification section channel'),
          {
            message:
              'NotificationSettingsSectionContent: update channel failed',
            type,
            channel: 'inAppNotificationsEnabled',
            nextValue: v,
          },
        );
        throw e;
      }
    },
    [updateSectionChannel, type, trackChannelUpdate],
  );

  const push = useOptimisticToggleValue({
    remoteValue: sectionPrefs?.pushNotificationsEnabled ?? false,
    onPersist: persistPush,
  });

  const inApp = useOptimisticToggleValue({
    remoteValue: sectionPrefs?.inAppNotificationsEnabled ?? false,
    onPersist: persistInApp,
  });

  // Wallet-activity has no channel toggles: its per-account subscriptions in
  // the Trigger API are the whole settings surface. Every other section keeps
  // the Trading Signals rule — dependent UI (thresholds, …) is greyed out when
  // neither channel can deliver notifications. `disabled` also covers the gate
  // sheet while the master toggle is still off.
  const showChannelToggles = type !== 'walletActivity';
  const isSectionContentDisabled =
    Boolean(disabled) || (showChannelToggles && !push.value && !inApp.value);

  const listHeader = useMemo(
    () => (
      <View>
        {title ? (
          <View style={styles.setting}>
            <Text color={TextColor.TextDefault} variant={TextVariant.HeadingLg}>
              {title}
            </Text>
            {description ? (
              <Text
                color={TextColor.TextAlternative}
                variant={TextVariant.BodyMd}
              >
                {description}
              </Text>
            ) : null}
          </View>
        ) : null}

        {showChannelToggles ? (
          <>
            <View style={styles.switchElement}>
              <Text
                color={disabled ? TextColor.TextMuted : TextColor.TextDefault}
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
              >
                {strings('app_settings.notifications_opts.push_recommended')}
              </Text>
              <Switch
                value={push.value}
                onValueChange={push.onValueChange}
                disabled={disabled}
                trackColor={{
                  true: theme.colors.primary.default,
                  false: theme.colors.border.muted,
                }}
                thumbColor={theme.brandColors.white}
                style={styles.switch}
                ios_backgroundColor={theme.colors.border.muted}
                testID={
                  NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE
                }
              />
            </View>

            <View style={styles.switchElement}>
              <Text
                color={disabled ? TextColor.TextMuted : TextColor.TextDefault}
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
              >
                {strings('app_settings.notifications_opts.in_app')}
              </Text>
              <Switch
                value={inApp.value}
                onValueChange={inApp.onValueChange}
                disabled={disabled}
                trackColor={{
                  true: theme.colors.primary.default,
                  false: theme.colors.border.muted,
                }}
                thumbColor={theme.brandColors.white}
                style={styles.switch}
                ios_backgroundColor={theme.colors.border.muted}
                testID={
                  NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE
                }
              />
            </View>
          </>
        ) : null}
      </View>
    ),
    [
      description,
      disabled,
      showChannelToggles,
      inApp.onValueChange,
      inApp.value,
      push.onValueChange,
      push.value,
      styles,
      theme,
      title,
    ],
  );

  if (!sectionPrefs) return null;

  if (sectionDefinition.layout === 'list') {
    const ListContent = sectionDefinition.Content;

    return (
      <ListContent
        styles={styles}
        disabled={isSectionContentDisabled}
        ListHeaderComponent={listHeader}
      />
    );
  }

  const SectionContent = sectionDefinition.Content;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID={NotificationSettingsViewSelectorsIDs.SECTION_SCROLL_VIEW}
    >
      {listHeader}
      {SectionContent ? (
        <SectionContent styles={styles} disabled={isSectionContentDisabled} />
      ) : null}
    </ScrollView>
  );
};
