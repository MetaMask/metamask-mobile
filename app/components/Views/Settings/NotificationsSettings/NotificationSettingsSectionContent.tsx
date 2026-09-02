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
import {
  isChannelEnabledForAusKeys,
  targetAusKeysInPreferences,
  type NotificationPreferenceChannelKey,
} from '../../../../util/notifications/categories';

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

const SETTINGS_TYPE_BY_CATEGORY: Record<string, string> = {
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
  const { updatePreferencesSection } = useNotificationStoragePreferences();
  const {
    accountProps,
    notificationAccountListProps,
    hasEnabledAccount,
    hasNotificationAccounts,
    isUpdatingAllAccounts,
    toggleAllAccounts,
  } = useWalletActivityAccountSelection();

  // Flip both channels in one write. The updater form is required:
  // `toggleAllAccounts` just rewrote the accounts, so building the section
  // from this render's preferences would PUT the pre-toggle accounts array
  // and re-enable every account.
  const handleToggleAllAccounts = useCallback(async () => {
    const nextEnabled = !hasEnabledAccount;

    await toggleAllAccounts();

    await updatePreferencesSection('walletActivity', (walletActivity) => ({
      ...walletActivity,
      pushNotificationsEnabled: nextEnabled,
      inAppNotificationsEnabled: nextEnabled,
    }));

    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
        .addProperties({
          settings_type: SETTINGS_TYPE_BY_CATEGORY.walletActivity,
          notification_channel: NotificationChannel.ALL,
          enabled: nextEnabled,
        })
        .build(),
    );
  }, [
    hasEnabledAccount,
    toggleAllAccounts,
    updatePreferencesSection,
    trackEvent,
    createEventBuilder,
  ]);

  const accountsListHeader = useMemo(
    () => (
      <View>
        {ListHeaderComponent}
        <View style={disabled ? styles.disabledContent : undefined}>
          <View style={styles.line} />
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

// Sections with dedicated content resolve by their backing AUS keys so a
// BE-driven category keeps working even when its categoryId differs from the
// underlying storage key. Categories with no matcher fall back to the plain
// scroll layout (e.g. perps, agenticCli, priceAlerts).
const SECTION_DEFINITION_MATCHERS: {
  matches: (ausKeys: string[]) => boolean;
  definition: SectionDefinition;
}[] = [
  {
    matches: (ausKeys) => ausKeys.includes('walletActivity'),
    definition: {
      layout: 'list',
      Content: WalletActivitySectionContent,
    },
  },
  {
    matches: (ausKeys) => ausKeys.includes('socialAI'),
    definition: {
      layout: 'scroll',
      Content: SocialAISectionContent,
    },
  },
  {
    matches: (ausKeys) => ausKeys.includes('marketing'),
    definition: {
      layout: 'scroll',
      Content: MarketingSectionContent,
    },
  },
];

const DEFAULT_SECTION_DEFINITION: SectionDefinition = { layout: 'scroll' };

export interface NotificationSettingsSectionContentProps {
  categoryId: string;
  ausKeys: string[];
  title?: string;
  description?: string;
  disabled?: boolean;
}

export const NotificationSettingsSectionContent = ({
  categoryId,
  ausKeys,
  title,
  description,
  disabled,
}: NotificationSettingsSectionContentProps) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { preferences, updateSectionChannel } =
    useNotificationStoragePreferences();
  const targetAusKeys = useMemo(
    () => targetAusKeysInPreferences(ausKeys, preferences),
    [ausKeys, preferences],
  );
  const sectionExists = targetAusKeys.length > 0;
  const sectionPrefs = sectionExists
    ? {
        pushNotificationsEnabled: isChannelEnabledForAusKeys(
          preferences,
          ausKeys,
          'pushNotificationsEnabled',
        ),
        inAppNotificationsEnabled: isChannelEnabledForAusKeys(
          preferences,
          ausKeys,
          'inAppNotificationsEnabled',
        ),
      }
    : undefined;
  const sectionDefinition =
    SECTION_DEFINITION_MATCHERS.find((matcher) => matcher.matches(ausKeys))
      ?.definition ?? DEFAULT_SECTION_DEFINITION;

  const trackChannelUpdate = useCallback(
    (channel: NotificationChannel, enabled: boolean) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
          .addProperties({
            settings_type: SETTINGS_TYPE_BY_CATEGORY[categoryId] ?? categoryId,
            notification_channel: channel,
            enabled,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder, categoryId],
  );

  const persistChannel = useCallback(
    async (
      channel: NotificationPreferenceChannelKey,
      nextValue: boolean,
      notificationChannel: NotificationChannel,
    ) => {
      try {
        await Promise.all(
          targetAusKeys.map((ausKey) =>
            updateSectionChannel(
              ausKey as NotificationPreferenceSection,
              channel,
              nextValue,
            ),
          ),
        );
        trackChannelUpdate(notificationChannel, nextValue);
      } catch (e) {
        Logger.error(
          new Error('Failed to update notification section channel'),
          {
            message:
              'NotificationSettingsSectionContent: update channel failed',
            categoryId,
            ausKeys,
            channel,
            nextValue,
          },
        );
        throw e;
      }
    },
    [
      targetAusKeys,
      updateSectionChannel,
      trackChannelUpdate,
      categoryId,
      ausKeys,
    ],
  );

  const persistPush = useCallback(
    (v: boolean) =>
      persistChannel('pushNotificationsEnabled', v, NotificationChannel.PUSH),
    [persistChannel],
  );

  const persistInApp = useCallback(
    (v: boolean) =>
      persistChannel(
        'inAppNotificationsEnabled',
        v,
        NotificationChannel.IN_APP,
      ),
    [persistChannel],
  );

  const push = useOptimisticToggleValue({
    remoteValue: sectionPrefs?.pushNotificationsEnabled ?? false,
    onPersist: persistPush,
  });

  const inApp = useOptimisticToggleValue({
    remoteValue: sectionPrefs?.inAppNotificationsEnabled ?? false,
    onPersist: persistInApp,
  });

  // Same rule as Trading Signals: dependent UI (accounts, thresholds, …) is
  // greyed out when neither channel can deliver notifications. `disabled` also
  // covers the gate sheet while the master toggle is still off.
  const isSectionContentDisabled =
    Boolean(disabled) || (!push.value && !inApp.value);

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
      </View>
    ),
    [
      description,
      disabled,
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
