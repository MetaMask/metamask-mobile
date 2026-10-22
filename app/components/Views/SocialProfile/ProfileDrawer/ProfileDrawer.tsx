import React, { useCallback } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  ButtonIconVariant,
  FontWeight,
  HeaderBase,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { ActivityScreenEntryPoint } from '../../../../core/Analytics/events/activity';
import { strings } from '../../../../../locales/i18n';
import { useAccountGroupName } from '../../../hooks/multichainAccounts/useAccountGroupName';
import { useAccountName } from '../../../hooks/useAccountName';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import { navigateToSocialV1Profile } from '../../SocialLeaderboard/navigation/navigateToSocialV1Profile';
import ProfileAvatar from '../../SocialLeaderboard/MyProfileView/components/ProfileAvatar';
import {
  useMyProfile,
  type MySocialProfile,
} from '../../SocialLeaderboard/MyProfileView/hooks/useMyProfile';
/* eslint-enable import-x/no-restricted-paths */
import {
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications';
import { useQRScanner } from '../../../hooks/useQRScanner';
import { ProfileDrawerSelectorsIDs } from './ProfileDrawer.testIds';
import ProfileDrawerMenuRow from './ProfileDrawerMenuRow';

const formatProfileHandle = (profile: MySocialProfile): string => {
  const raw = profile.handle.trim() || profile.displayName.trim();
  if (!raw) {
    return '';
  }
  return raw.startsWith('@') ? raw : `@${raw}`;
};

const ProfileDrawer = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { openQRScanner } = useQRScanner();

  // The list stays populated while notifications are off, so gate the badge on
  // the feature flag and the user's setting, as AccountsMenu does.
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );
  const notificationBadgeCount =
    isNotificationsFeatureEnabled() && isNotificationEnabled
      ? unreadNotificationCount
      : 0;

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNotifications = useCallback(() => {
    navigation.navigate(Routes.NOTIFICATIONS.VIEW);
  }, [navigation]);

  const handleSettings = useCallback(() => {
    // SettingsFlow opens on the accounts menu, so name the nested screen.
    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.ROOT,
    });
  }, [navigation]);

  const handleActivity = useCallback(() => {
    navigation.navigate(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: { entryPoint: ActivityScreenEntryPoint.ProfileDrawer },
    });
  }, [navigation]);

  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  // Offline or low-memory devices stay on the profile already in the
  // controller. A refresh is a network fetch, so those cells skip it.
  const canRefreshProfile = networkTier !== 'NONE' && hardwareTier !== 'LOW';
  const { profile, isLoading } = useMyProfile({ enabled: canRefreshProfile });
  const accountGroupName = useAccountGroupName();
  const accountName = useAccountName();
  const accountLabel = accountGroupName || accountName;

  const handleCreateProfile = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
  }, [navigation]);

  const handleOpenProfile = useCallback(() => {
    navigateToSocialV1Profile(navigation);
  }, [navigation]);

  // TODO: wire Subscriptions and Help and support once those screens exist.
  const handlePress = useCallback(() => undefined, []);

  const menuItems: {
    iconName: IconName;
    label: string;
    badgeCount?: number;
    onPress?: () => void;
    testID: string;
  }[] = [
    {
      iconName: IconName.Notification,
      label: strings('profile_drawer.notifications'),
      badgeCount: notificationBadgeCount,
      onPress: handleNotifications,
      testID: ProfileDrawerSelectorsIDs.NOTIFICATIONS_ROW,
    },
    {
      iconName: IconName.Clock,
      label: strings('profile_drawer.activity'),
      onPress: handleActivity,
      testID: ProfileDrawerSelectorsIDs.ACTIVITY_ROW,
    },
    {
      iconName: IconName.Sparkle,
      label: strings('profile_drawer.subscriptions'),
      testID: ProfileDrawerSelectorsIDs.SUBSCRIPTIONS_ROW,
    },
    {
      iconName: IconName.Setting,
      label: strings('profile_drawer.settings'),
      onPress: handleSettings,
      testID: ProfileDrawerSelectorsIDs.SETTINGS_ROW,
    },
    {
      iconName: IconName.Question,
      label: strings('profile_drawer.help_and_support'),
      testID: ProfileDrawerSelectorsIDs.HELP_AND_SUPPORT_ROW,
    },
  ];

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={ProfileDrawerSelectorsIDs.SAFE_AREA}
    >
      <HeaderBase
        includesTopInset
        // HeaderBase has no horizontal padding, so the buttons would sit flush
        // against the screen edge.
        twClassName="px-4"
        testID={ProfileDrawerSelectorsIDs.HEADER}
        startButtonIconProps={{
          iconName: IconName.Close,
          variant: ButtonIconVariant.Filled,
          onPress: handleClose,
          accessibilityLabel: strings('profile_drawer.close'),
          testID: ProfileDrawerSelectorsIDs.CLOSE_BUTTON,
        }}
        endButtonIconProps={[
          {
            iconName: IconName.QrCode,
            variant: ButtonIconVariant.Filled,
            onPress: openQRScanner,
            accessibilityLabel: strings('profile_drawer.scan'),
            testID: ProfileDrawerSelectorsIDs.SCAN_BUTTON,
          },
        ]}
      />
      <ScrollView
        contentContainerStyle={tw.style('pb-8')}
        testID={ProfileDrawerSelectorsIDs.CONTENT}
      >
        {profile ? (
          <Pressable
            onPress={handleOpenProfile}
            accessibilityRole="button"
            accessibilityLabel={formatProfileHandle(profile)}
            testID={ProfileDrawerSelectorsIDs.PROFILE_IDENTITY}
            style={({ pressed }) =>
              tw.style('items-center px-4 pb-6 pt-2', pressed && 'opacity-70')
            }
          >
            <Box alignItems={BoxAlignItems.Center} gap={3}>
              <ProfileAvatar
                imageUrl={profile.imageUrl}
                avatarPresetId={profile.avatarPresetId}
                avatarBackgroundId={profile.avatarBackgroundId}
                size="lg"
                testID={ProfileDrawerSelectorsIDs.PROFILE_AVATAR}
              />
              <Box alignItems={BoxAlignItems.Center} gap={1} accessible={false}>
                <Text
                  variant={TextVariant.HeadingLg}
                  fontWeight={FontWeight.Bold}
                  testID={ProfileDrawerSelectorsIDs.PROFILE_HANDLE}
                >
                  {formatProfileHandle(profile)}
                </Text>
                {accountLabel ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    testID={ProfileDrawerSelectorsIDs.PROFILE_ACCOUNT_NAME}
                  >
                    {accountLabel}
                  </Text>
                ) : null}
              </Box>
            </Box>
          </Pressable>
        ) : isLoading ? (
          <Box
            twClassName="px-4 pb-6 pt-2"
            accessible={false}
            testID={ProfileDrawerSelectorsIDs.PROFILE_LOADING}
          />
        ) : (
          <Pressable
            onPress={handleCreateProfile}
            accessibilityRole="button"
            accessibilityLabel={strings('profile_drawer.create_profile')}
            testID={ProfileDrawerSelectorsIDs.CREATE_PROFILE}
            style={({ pressed }) =>
              tw.style('items-center px-4 pb-6 pt-2', pressed && 'opacity-70')
            }
          >
            <Box alignItems={BoxAlignItems.Center} gap={3}>
              <AvatarIcon
                iconName={IconName.UserCircleAdd}
                size={AvatarIconSize.Xl}
                severity={AvatarIconSeverity.Neutral}
                testID={ProfileDrawerSelectorsIDs.CREATE_PROFILE_AVATAR}
              />
              <Text
                variant={TextVariant.HeadingLg}
                fontWeight={FontWeight.Bold}
              >
                {strings('profile_drawer.create_profile')}
              </Text>
            </Box>
          </Pressable>
        )}

        <Box>
          {menuItems.map(({ iconName, label, badgeCount, onPress, testID }) => (
            <ProfileDrawerMenuRow
              key={testID}
              iconName={iconName}
              label={label}
              badgeCount={badgeCount}
              onPress={onPress ?? handlePress}
              testID={testID}
            />
          ))}
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileDrawer;
