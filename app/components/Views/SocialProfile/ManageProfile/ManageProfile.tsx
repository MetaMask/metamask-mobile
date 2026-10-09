import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
  Box,
  BoxAlignItems,
  Card,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionHeader,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import { BIO_VALUE_MAX_WIDTH, type Profile } from './ManageProfile.constants';
import ProfileRow from './ProfileRow';
import ProfileAvatar from './ProfileAvatar';

const SECTION_TITLE_PROPS = {
  variant: TextVariant.BodySm,
  fontWeight: FontWeight.Medium,
  color: TextColor.TextAlternative,
};

/** Unset fields read as a muted placeholder rather than an empty row. */
const valueOrPlaceholder = (value: string) =>
  value || strings('manage_profile.not_set');

// TODO: replace with the real profile source. Rows stay read-only until the
// field editors exist.
const EMPTY_PROFILE: Profile = {
  image: undefined,
  displayName: '',
  handle: '',
  bio: '',
  socialHandle: '',
  isTradingActivityVisible: false,
  linkedSocialAccountName: '',
};

const ManageProfile = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const profile = EMPTY_PROFILE;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={ManageProfileSelectorsIDs.SAFE_AREA}
    >
      <HeaderStandard
        title={strings('manage_profile.header')}
        onBack={handleBack}
        includesTopInset
        testID={ManageProfileSelectorsIDs.HEADER}
        backButtonProps={{
          testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
        }}
      />
      <ScrollView
        contentContainerStyle={tw.style('pb-8')}
        testID={ManageProfileSelectorsIDs.CONTENT}
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="py-4">
          <ProfileAvatar
            src={profile.image}
            twClassName="bg-default"
            imageProps={{ contentFit: 'contain' }}
            accessibilityLabel={
              profile.displayName ||
              strings('manage_profile.avatar_accessibility_label')
            }
            testID={ManageProfileSelectorsIDs.AVATAR}
          />
        </Box>

        <SectionHeader
          title={strings('manage_profile.about')}
          titleProps={SECTION_TITLE_PROPS}
          testID={ManageProfileSelectorsIDs.ABOUT_SECTION}
        />
        <Card twClassName="mx-4 overflow-hidden p-0">
          <ProfileRow
            title={strings('manage_profile.display_name')}
            value={valueOrPlaceholder(profile.displayName)}
            testID={ManageProfileSelectorsIDs.DISPLAY_NAME_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('manage_profile.handle')}
            value={valueOrPlaceholder(profile.handle)}
            testID={ManageProfileSelectorsIDs.HANDLE_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('manage_profile.bio')}
            value={valueOrPlaceholder(profile.bio)}
            valueMaxWidth={BIO_VALUE_MAX_WIDTH}
            testID={ManageProfileSelectorsIDs.BIO_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('manage_profile.x_account')}
            value={valueOrPlaceholder(profile.socialHandle)}
            valueStartAccessory={
              profile.socialHandle ? (
                <Icon
                  name={IconName.X}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              ) : undefined
            }
            testID={ManageProfileSelectorsIDs.X_ACCOUNT_ROW}
          />
        </Card>

        <SectionHeader
          title={strings('manage_profile.privacy')}
          titleProps={SECTION_TITLE_PROPS}
          testID={ManageProfileSelectorsIDs.PRIVACY_SECTION}
        />
        <Card twClassName="mx-4 overflow-hidden p-0">
          <ProfileRow
            title={strings('manage_profile.trading_activity')}
            value={
              profile.isTradingActivityVisible
                ? strings('manage_profile.on')
                : strings('manage_profile.off')
            }
            valueStartAccessory={
              <Icon
                name={IconName.Lock}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            }
            testID={ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('manage_profile.linked_social_account')}
            value={
              profile.linkedSocialAccountName ||
              strings('manage_profile.no_linked_account')
            }
            valueStartAccessory={
              profile.linkedSocialAccountAddress ? (
                <AvatarAccount
                  address={profile.linkedSocialAccountAddress}
                  variant={AvatarAccountVariant.Maskicon}
                  size={AvatarAccountSize.Xs}
                />
              ) : undefined
            }
            testID={ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageProfile;
