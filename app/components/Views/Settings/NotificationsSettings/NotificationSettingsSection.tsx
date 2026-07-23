import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  StackActions,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  type NotificationPreferenceChannelKey,
  type NotificationPreferenceSection,
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
import Logger from '../../../../util/Logger';

type NotificationSettingsStyles = ReturnType<typeof styleSheet>;

interface SectionContentProps {
  styles: NotificationSettingsStyles;
}

const SETTINGS_TYPE_BY_SECTION: Record<NotificationPreferenceSection, string> =
  {
    walletActivity: 'wallet_activity',
    perps: 'perps',
    agenticCli: 'agentic_cli',
    socialAI: 'social_ai',
    marketing: 'marketing',
    priceAlerts: 'price_alerts',
  };

const CHANNEL_BY_KEY: Record<
  NotificationPreferenceChannelKey,
  NotificationChannel
> = {
  pushNotificationsEnabled: NotificationChannel.PUSH,
  inAppNotificationsEnabled: NotificationChannel.IN_APP,
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

  // Toggling all accounts flips both wallet-activity channels in one section
  // update so they don't race on the shared (stale) preferences snapshot.
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
    NotificationPreferenceSection,
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
        type: NotificationPreferenceSection;
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
  const { preferences, updateSectionChannel } =
    useNotificationStoragePreferences();
  const [pendingChannelToggles, setPendingChannelToggles] = useState<
    Partial<Record<NotificationPreferenceChannelKey, boolean>>
  >({});
  const channelGenerationsRef = useRef<
    Record<NotificationPreferenceChannelKey, number>
  >({
    pushNotificationsEnabled: 0,
    inAppNotificationsEnabled: 0,
  });
  const sectionPrefs = preferences?.[type];
  const SectionContent = SECTION_CONTENT_BY_TYPE[type];

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

  useEffect(() => {
    if (!isMetamaskNotificationsEnabled) {
      navigation.dispatch(StackActions.replace(Routes.SETTINGS.NOTIFICATIONS));
    }
  }, [isMetamaskNotificationsEnabled, navigation]);

  const clearPendingChannelToggle = useCallback(
    (channel: NotificationPreferenceChannelKey) => {
      setPendingChannelToggles((current) => {
        if (current[channel] === undefined) {
          return current;
        }

        const next = { ...current };
        delete next[channel];
        return next;
      });
    },
    [],
  );

  const handleChannelToggle = useCallback(
    (channel: NotificationPreferenceChannelKey, nextValue: boolean) => {
      channelGenerationsRef.current[channel] += 1;
      const generation = channelGenerationsRef.current[channel];

      setPendingChannelToggles((current) => ({
        ...current,
        [channel]: nextValue,
      }));

      updateSectionChannel(type, channel, nextValue)
        .then(() => {
          trackChannelUpdate(CHANNEL_BY_KEY[channel], nextValue);
        })
        .catch(() => {
          Logger.error(
            new Error('Failed to update notification section channel'),
            {
              message: 'NotificationSettingsSection: update channel failed',
              type,
              channel,
              nextValue,
            },
          );

          if (channelGenerationsRef.current[channel] === generation) {
            clearPendingChannelToggle(channel);
          }
        });
    },
    [clearPendingChannelToggle, trackChannelUpdate, type, updateSectionChannel],
  );

  useEffect(() => {
    if (!sectionPrefs) {
      return;
    }

    (
      [
        'pushNotificationsEnabled',
        'inAppNotificationsEnabled',
      ] as NotificationPreferenceChannelKey[]
    ).forEach((channel) => {
      if (pendingChannelToggles[channel] === sectionPrefs[channel]) {
        clearPendingChannelToggle(channel);
      }
    });
  }, [clearPendingChannelToggle, pendingChannelToggles, sectionPrefs]);

  if (!isMetamaskNotificationsEnabled || !sectionPrefs) {
    return null;
  }

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
            value={
              pendingChannelToggles.pushNotificationsEnabled ??
              sectionPrefs.pushNotificationsEnabled
            }
            onValueChange={(nextValue) =>
              handleChannelToggle('pushNotificationsEnabled', nextValue)
            }
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
            color={TextColor.TextDefault}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
          >
            {strings('app_settings.notifications_opts.in_app')}
          </Text>
          <Switch
            value={
              pendingChannelToggles.inAppNotificationsEnabled ??
              sectionPrefs.inAppNotificationsEnabled
            }
            onValueChange={(nextValue) =>
              handleChannelToggle('inAppNotificationsEnabled', nextValue)
            }
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

        {SectionContent ? <SectionContent styles={styles} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationSettingsSection;
