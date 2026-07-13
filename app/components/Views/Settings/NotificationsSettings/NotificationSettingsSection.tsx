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
  type NotificationPreferenceSection,
} from './hooks/useNotificationStoragePreferences';
import { AccountsList } from './AccountsList';
import { strings } from '../../../../../locales/i18n';
import SocialAINotificationPreferencesContent from './SocialAINotificationPreferencesContent';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import Routes from '../../../../constants/navigation/Routes';
import { useWalletActivityAccountSelection } from './AccountsList.hooks';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import Logger from '../../../../util/Logger';
import {
  isChannelEnabledForAusKeys,
  targetAusKeysInPreferences,
  type NotificationPreferenceChannelKey,
} from '../../../../util/notifications/categories';

type NotificationSettingsStyles = ReturnType<typeof styleSheet>;

interface SectionContentProps {
  styles: NotificationSettingsStyles;
}

const WalletActivitySectionContent = ({ styles }: SectionContentProps) => {
  const {
    accountProps,
    notificationAccountListProps,
    hasEnabledAccount,
    hasNotificationAccounts,
    isUpdatingAllAccounts,
    toggleAllAccounts,
  } = useWalletActivityAccountSelection();

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
              onPress={toggleAllAccounts}
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

const SECTION_CONTENT_RESOLVERS: Array<{
  matches: (ausKeys: string[]) => boolean;
  Component: React.ComponentType<SectionContentProps>;
}> = [
  {
    matches: (ausKeys) => ausKeys.includes('walletActivity'),
    Component: WalletActivitySectionContent,
  },
  {
    matches: (ausKeys) => ausKeys.includes('socialAI'),
    Component: SocialAISectionContent,
  },
  {
    matches: (ausKeys) => ausKeys.includes('marketing'),
    Component: MarketingSectionContent,
  },
];

export interface NotificationSettingsSectionProps {
  navigation: NavigationProp<ParamListBase>;
  route: RouteProp<
    {
      params: {
        categoryId: string;
        ausKeys: string[];
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
  const { categoryId, ausKeys, title, description } = route.params;

  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const { preferences, updateSectionChannel } =
    useNotificationStoragePreferences();
  const [pendingChannelToggles, setPendingChannelToggles] = useState<
    Partial<Record<NotificationPreferenceChannelKey, boolean>>
  >({});
  // TODO: bookkeeping is keyed only by channel, not by (channel, ausKey) — fine
  // while every category backs a single ausKey, but revisit once a category
  // can genuinely span multiple ausKeys toggled independently.
  const channelGenerationsRef = useRef<
    Record<NotificationPreferenceChannelKey, number>
  >({
    pushNotificationsEnabled: 0,
    inAppNotificationsEnabled: 0,
  });
  const sectionExists = targetAusKeysInPreferences(ausKeys, preferences)
    .length > 0;
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
  const SectionContent = SECTION_CONTENT_RESOLVERS.find((resolver) =>
    resolver.matches(ausKeys),
  )?.Component;

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

      const targetAusKeys = targetAusKeysInPreferences(ausKeys, preferences);

      Promise.all(
        targetAusKeys.map((ausKey) =>
          updateSectionChannel(
            ausKey as NotificationPreferenceSection,
            channel,
            nextValue,
          ),
        ),
      ).catch(() => {
        Logger.error(
          new Error('Failed to update notification section channel'),
          {
            message: 'NotificationSettingsSection: update channel failed',
            categoryId,
            ausKeys,
            channel,
            nextValue,
          },
        );

        if (channelGenerationsRef.current[channel] === generation) {
          clearPendingChannelToggle(channel);
        }
      });
    },
    [ausKeys, categoryId, clearPendingChannelToggle, preferences, updateSectionChannel],
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
