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
import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import ProfileAvatar from '../MyProfileView/components/ProfileAvatar';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { renderShortAddress } from '../../../../util/address';
import { useLinkableSocialAccounts } from '../hooks/useLinkableSocialAccounts';
import { useMyProfile } from '../MyProfileView/hooks';
import { useProfileController } from './hooks/useProfileController';
import ManageProfileNavRow from './components/ManageProfileNavRow';
import ManageProfileScreenChrome from './components/ManageProfileScreenChrome';
import { ManageProfileViewSelectorsIDs } from './ManageProfileView.testIds';
import type { ManageProfileTextEditorField } from './screens/manageProfileTextEditorFields';

const ManageProfileView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const { profile } = useMyProfile();
  const { isControllerBacked, disconnectX } = useProfileController();
  const accounts = useLinkableSocialAccounts();
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const [isDisconnectingX, setIsDisconnectingX] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleDisconnectX = useCallback(async (): Promise<void> => {
    if (!isControllerBacked || !profile?.profileId || !profile.connectedToX) {
      return;
    }

    setIsDisconnectingX(true);
    setErrorMessage(null);

    try {
      await disconnectX(profile.profileId);
    } catch {
      setErrorMessage(strings('social_leaderboard.manage_profile.save_error'));
    } finally {
      setIsDisconnectingX(false);
    }
  }, [
    disconnectX,
    isControllerBacked,
    profile?.connectedToX,
    profile?.profileId,
  ]);

  const displayName = profile?.displayName ?? '';
  const handle = profile?.handle ? `@${profile.handle}` : '';
  const bio = profile?.bio ?? '';
  let socials = '';
  if (profile?.xHandle) {
    socials = `X @${profile.xHandle}`;
  } else if (profile?.connectedToX) {
    socials = 'X';
  }
  const tradingActivityValue = strings(
    profile?.shareTradingActivity
      ? 'social_leaderboard.manage_profile.trading_activity_on'
      : 'social_leaderboard.manage_profile.trading_activity_off',
  );
  const editorsDisabled = !isControllerBacked;
  const socialsDisabled =
    !isControllerBacked || !profile?.connectedToX || isDisconnectingX;

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
          <ProfileAvatar
            imageUrl={profile?.imageUrl}
            avatarPresetId={profile?.avatarPresetId}
            avatarBackgroundId={profile?.avatarBackgroundId}
            size="lg"
            accessibilityLabel={strings(
              'social_leaderboard.manage_profile.avatar_accessibility_label',
            )}
            testID={ManageProfileViewSelectorsIDs.AVATAR}
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
            disabled={editorsDisabled}
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
              handleDisconnectX().catch(() => undefined);
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
            twClassName="mt-3"
          >
            {errorMessage}
          </Text>
        ) : null}
      </ScrollView>
    </ManageProfileScreenChrome>
  );
};

export default ManageProfileView;
