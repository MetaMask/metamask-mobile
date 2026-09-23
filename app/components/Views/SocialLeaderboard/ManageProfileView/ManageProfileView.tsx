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
import React, { useCallback } from 'react';
import { Image, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import superheroAvatar from '../../../../images/socialV1/superhero.png';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { renderShortAddress } from '../../../../util/address';
import { useMyProfile } from '../MyProfileView/hooks';
import ManageProfileNavRow from './components/ManageProfileNavRow';
import ManageProfileScreenChrome from './components/ManageProfileScreenChrome';
import { ManageProfileViewSelectorsIDs } from './ManageProfileView.testIds';
import type { ManageProfileTextEditorField } from './screens/manageProfileTextEditorFields';

const ManageProfileView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const { profile } = useMyProfile();
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const linkedAccountName = selectedAccount
    ? selectedAccount.metadata.name?.trim() ||
      renderShortAddress(selectedAccount.address)
    : undefined;

  const handleOpenTextEditor = useCallback(
    (field: ManageProfileTextEditorField) => {
      navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE_TEXT_EDITOR, { field });
    },
    [navigation],
  );

  const handleOpenTradingActivity = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE_TRADING_ACTIVITY);
  }, [navigation]);

  const handleOpenLinkedAccount = useCallback(() => {
    navigation.navigate(Routes.SOCIAL.MANAGE_PROFILE_LINKED_ACCOUNT);
  }, [navigation]);

  const displayName = profile?.displayName ?? '';
  const handle = profile?.handle ? `@${profile.handle}` : '';
  const bio = profile?.bio ?? '';
  const socials = profile?.xHandle ? `X @${profile.xHandle}` : '';

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
          <Image
            source={
              profile?.imageUrl ? { uri: profile.imageUrl } : superheroAvatar
            }
            accessibilityLabel={strings(
              'social_leaderboard.manage_profile.avatar_accessibility_label',
            )}
            style={tw.style('w-16 h-16 rounded-full')}
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
            onPress={() => handleOpenTextEditor('displayName')}
            testID={ManageProfileViewSelectorsIDs.DISPLAY_NAME_ROW}
          />
          <ManageProfileNavRow
            label={strings('social_leaderboard.manage_profile.handle')}
            value={handle}
            onPress={() => handleOpenTextEditor('handle')}
            showTopBorder
            testID={ManageProfileViewSelectorsIDs.HANDLE_ROW}
          />
          <ManageProfileNavRow
            label={strings('social_leaderboard.manage_profile.bio')}
            value={bio}
            onPress={() => handleOpenTextEditor('bio')}
            showTopBorder
            testID={ManageProfileViewSelectorsIDs.BIO_ROW}
          />
          <ManageProfileNavRow
            label={strings('social_leaderboard.manage_profile.socials')}
            value={socials}
            onPress={() => handleOpenTextEditor('socials')}
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
            value={strings(
              'social_leaderboard.manage_profile.trading_activity_on',
            )}
            valueAccessory={
              <Icon
                name={IconName.Lock}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            }
            onPress={handleOpenTradingActivity}
            testID={ManageProfileViewSelectorsIDs.TRADING_ACTIVITY_ROW}
          />
          <ManageProfileNavRow
            label={strings(
              'social_leaderboard.manage_profile.linked_social_account',
            )}
            value={linkedAccountName}
            valueAccessory={
              selectedAccount ? (
                <AvatarAccount
                  address={selectedAccount.address}
                  size={AvatarAccountSize.Xs}
                  variant={getAvatarAccountVariant(avatarAccountType)}
                  testID={ManageProfileViewSelectorsIDs.LINKED_ACCOUNT_AVATAR}
                />
              ) : null
            }
            onPress={handleOpenLinkedAccount}
            showTopBorder
            testID={ManageProfileViewSelectorsIDs.LINKED_ACCOUNT_ROW}
          />
        </Box>
      </ScrollView>
    </ManageProfileScreenChrome>
  );
};

export default ManageProfileView;
