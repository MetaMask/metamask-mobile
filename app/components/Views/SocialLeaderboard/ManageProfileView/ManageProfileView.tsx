import {
  AvatarAccount,
  AvatarAccountSize,
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import EditableProfileAvatar from '../MyProfileView/components/EditableProfileAvatar';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { renderShortAddress } from '../../../../util/address';
import { useLinkableSocialAccounts } from '../hooks/useLinkableSocialAccounts';
import { useMyProfile } from '../MyProfileView/hooks';
import { useProfileController } from './hooks/useProfileController';
import { useXAuth } from '../../../../hooks/useXAuth';
import { XAuthErrorType } from '../../../../core/XAuthService';
import ManageProfileNavRow from './components/ManageProfileNavRow';
import ManageProfileScreenChrome from './components/ManageProfileScreenChrome';
import { ManageProfileViewSelectorsIDs } from './ManageProfileView.testIds';
import type { ManageProfileTextEditorField } from './screens/manageProfileTextEditorFields';
import { SocialEvent, useSocialScreenAnalytics } from '../analytics';

const ManageProfileView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const { profile } = useMyProfile();
  const { isControllerBacked } = useProfileController();
  const {
    isConnected: isConnectedToX,
    xProfile,
    isConnecting: isConnectingX,
    connectError: xAuthConnectError,
    connect: connectX,
  } = useXAuth();
  useSocialScreenAnalytics(SocialEvent.Screen.MANAGE_PROFILE, {
    resetWhenInactive: false,
  });
  const accounts = useLinkableSocialAccounts();
  const avatarAccountType = useSelector(selectAvatarAccountType);
  // `connect` resolves void, so the outcome is read from hook state rather than
  // a return value: `connectError` is set on failure and cleared when the next
  // connect starts. A user-cancelled OAuth stays silent.
  const errorMessage =
    xAuthConnectError && xAuthConnectError.type !== XAuthErrorType.UserCancelled
      ? strings('social_leaderboard.profile_onboarding.connect_x_error')
      : null;

  // The live region on the error line covers TalkBack, but VoiceOver keeps
  // focus on the row that started OAuth and does not re-read a changed
  // sibling. Announce the failure explicitly for both (WCAG 4.1.3).
  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(errorMessage);
  }, [errorMessage]);

  const linkedAccount = profile?.linkedAccountAddress
    ? accounts.find(
        (account) =>
          account.address.toLowerCase() ===
          profile.linkedAccountAddress?.toLowerCase(),
      )
    : undefined;
  const linkedAccountName =
    linkedAccount?.name ??
    (profile?.linkedAccountAddress
      ? renderShortAddress(profile.linkedAccountAddress)
      : undefined);

  const handleOpenTextEditor = useCallback(
    (field: ManageProfileTextEditorField) => {
      if (!isControllerBacked) {
        return;
      }
      navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE_TEXT_EDITOR, { field });
    },
    [isControllerBacked, navigation],
  );

  const handleOpenTradingActivity = useCallback(() => {
    if (!isControllerBacked) {
      return;
    }
    navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE_TRADING_ACTIVITY);
  }, [isControllerBacked, navigation]);

  const handleOpenLinkedAccount = useCallback(() => {
    if (!isControllerBacked) {
      return;
    }
    navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE_LINKED_ACCOUNT);
  }, [isControllerBacked, navigation]);

  const handleEditAvatar = useCallback(() => {
    if (!isControllerBacked) {
      return;
    }
    navigation.navigate(Routes.SOCIAL.EDIT_AVATAR);
  }, [isControllerBacked, navigation]);

  const handleSocialsPress = useCallback(async (): Promise<void> => {
    if (!isControllerBacked || isConnectingX) {
      return;
    }
    if (isConnectedToX) {
      navigation.navigate(Routes.SOCIAL_PROFILE.X_ACCOUNT);
      return;
    }

    await connectX();
  }, [connectX, isConnectedToX, isConnectingX, isControllerBacked, navigation]);

  const displayName = profile?.displayName ?? '';
  const handle = profile?.handle ? `@${profile.handle}` : '';
  const bio = profile?.bio ?? '';
  // Prefer the controller's X profile: connectX writes it immediately, while
  // the profile's xHandle only updates after a refetch.
  const xHandle = xProfile?.username || profile?.xHandle;
  let socials = '';
  if (xHandle) {
    socials = `X @${xHandle}`;
  } else if (isConnectedToX) {
    socials = 'X';
  }
  const tradingActivityValue = strings(
    profile?.shareTradingActivity
      ? 'social_leaderboard.manage_profile.trading_activity_on'
      : 'social_leaderboard.manage_profile.trading_activity_off',
  );
  const editorsDisabled = !isControllerBacked;
  const socialsDisabled = !isControllerBacked || isConnectingX;

  return (
    <ManageProfileScreenChrome
      title={strings('social_leaderboard.manage_profile.title')}
      testID={ManageProfileViewSelectorsIDs.CONTAINER}
      headerTestID={ManageProfileViewSelectorsIDs.HEADER}
      backTestID={ManageProfileViewSelectorsIDs.BACK_BUTTON}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('flex-grow px-4 pb-6')}
      >
        <Box twClassName="items-center py-4">
          <EditableProfileAvatar
            imageUrl={profile?.imageUrl}
            avatarPresetId={profile?.avatarPresetId}
            avatarBackgroundId={profile?.avatarBackgroundId}
            onPress={handleEditAvatar}
            avatarTestID={ManageProfileViewSelectorsIDs.AVATAR}
            editTestID={ManageProfileViewSelectorsIDs.EDIT_AVATAR_BUTTON}
            accessibilityLabel={strings(
              'social_leaderboard.manage_profile.avatar_accessibility_label',
            )}
          />
        </Box>

        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mb-2"
        >
          {strings('social_leaderboard.manage_profile.about')}
        </Text>
        <Box
          twClassName="bg-muted rounded-2xl overflow-hidden mb-6"
          testID={ManageProfileViewSelectorsIDs.ABOUT_SECTION}
        >
          <ManageProfileNavRow
            label={strings('social_leaderboard.manage_profile.display_name')}
            value={displayName}
            disabled={editorsDisabled}
            onPress={() => handleOpenTextEditor('displayName')}
            testID={ManageProfileViewSelectorsIDs.DISPLAY_NAME_ROW}
          />
          <ManageProfileNavRow
            label={strings('social_leaderboard.manage_profile.handle')}
            value={handle}
            // v1: the handle is permanent once the profile is set up.
            disabled={editorsDisabled || Boolean(profile?.handle)}
            onPress={() => handleOpenTextEditor('handle')}
            showTopBorder
            testID={ManageProfileViewSelectorsIDs.HANDLE_ROW}
          />
          <ManageProfileNavRow
            label={strings('social_leaderboard.manage_profile.bio')}
            value={bio}
            disabled={editorsDisabled}
            onPress={() => handleOpenTextEditor('bio')}
            showTopBorder
            testID={ManageProfileViewSelectorsIDs.BIO_ROW}
          />
          <ManageProfileNavRow
            label={strings('social_leaderboard.manage_profile.socials')}
            value={socials}
            disabled={socialsDisabled}
            onPress={() => {
              handleSocialsPress().catch(() => undefined);
            }}
            showTopBorder
            testID={ManageProfileViewSelectorsIDs.SOCIALS_ROW}
          />
        </Box>

        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mb-2"
        >
          {strings('social_leaderboard.manage_profile.privacy')}
        </Text>
        <Box
          twClassName="bg-muted rounded-2xl overflow-hidden"
          testID={ManageProfileViewSelectorsIDs.PRIVACY_SECTION}
        >
          <ManageProfileNavRow
            label={strings(
              'social_leaderboard.manage_profile.trading_activity',
            )}
            value={tradingActivityValue}
            valueAccessory={
              <Icon
                name={IconName.Lock}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            }
            disabled={editorsDisabled}
            onPress={handleOpenTradingActivity}
            testID={ManageProfileViewSelectorsIDs.TRADING_ACTIVITY_ROW}
          />
          <ManageProfileNavRow
            label={strings(
              'social_leaderboard.manage_profile.linked_social_account',
            )}
            value={linkedAccountName}
            valueAccessory={
              linkedAccount ? (
                <AvatarAccount
                  address={linkedAccount.address}
                  size={AvatarAccountSize.Xs}
                  variant={getAvatarAccountVariant(avatarAccountType)}
                  testID={ManageProfileViewSelectorsIDs.LINKED_ACCOUNT_AVATAR}
                />
              ) : null
            }
            disabled={editorsDisabled}
            onPress={handleOpenLinkedAccount}
            showTopBorder
            testID={ManageProfileViewSelectorsIDs.LINKED_ACCOUNT_ROW}
          />
        </Box>
        {errorMessage ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            twClassName="mt-3"
            testID={ManageProfileViewSelectorsIDs.X_CONNECT_ERROR}
          >
            {errorMessage}
          </Text>
        ) : null}
      </ScrollView>
    </ManageProfileScreenChrome>
  );
};

export default ManageProfileView;
