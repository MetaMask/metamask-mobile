import React, { useCallback, useMemo, useState } from 'react';
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
import {
  BIO_VALUE_MAX_WIDTH,
  PROFILE_FIELD_MAX_LENGTH,
  type Profile,
} from './ManageProfile.constants';
import ProfileRow from './ProfileRow';
import ProfileAvatar from './ProfileAvatar';
import ManageProfileFieldSheet, {
  ProfileFieldControl,
  type ProfileFieldValue,
} from './ManageProfileFieldSheet';

const SECTION_TITLE_PROPS = {
  variant: TextVariant.BodySm,
  fontWeight: FontWeight.Medium,
  color: TextColor.TextAlternative,
};

/** The profile attributes that currently have an edit form. */
const EditableField = {
  DisplayName: 'displayName',
  Bio: 'bio',
  TradingActivity: 'tradingActivity',
} as const;

type EditableField = (typeof EditableField)[keyof typeof EditableField];

/** Unset fields read as a muted placeholder rather than an empty row. */
const valueOrPlaceholder = (value: string) =>
  value || strings('app_settings.manage_profile.not_set');

const ManageProfile = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  // TODO: replace with the real profile source. Edits live here so the rows
  // reflect them, but nothing is persisted.
  const [profile, setProfile] = useState<Profile>({
    image: undefined,
    displayName: '',
    handle: '',
    bio: '',
    socialHandle: '',
    isTradingActivityVisible: false,
    linkedSocialAccountName: '',
    linkedSocialAccountAddress: '',
  });
  const [editingField, setEditingField] = useState<EditableField | null>(null);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // TODO: navigate to the account picker once that screen exists.
  const handleOpenLinkedSocialAccount = useCallback(() => undefined, []);

  const handleEditDisplayName = useCallback(
    () => setEditingField(EditableField.DisplayName),
    [],
  );
  const handleEditBio = useCallback(
    () => setEditingField(EditableField.Bio),
    [],
  );
  const handleEditTradingActivity = useCallback(
    () => setEditingField(EditableField.TradingActivity),
    [],
  );

  const handleCloseSheet = useCallback(() => setEditingField(null), []);

  const handleSaveField = useCallback(
    (value: ProfileFieldValue) => {
      setProfile((previous) => {
        if (editingField === EditableField.DisplayName) {
          return { ...previous, displayName: String(value) };
        }
        if (editingField === EditableField.Bio) {
          return { ...previous, bio: String(value) };
        }
        if (editingField === EditableField.TradingActivity) {
          return { ...previous, isTradingActivityVisible: Boolean(value) };
        }
        return previous;
      });
    },
    [editingField],
  );

  const sheetProps = useMemo(() => {
    switch (editingField) {
      case EditableField.DisplayName:
        return {
          title: strings('app_settings.manage_profile.display_name'),
          label: strings('app_settings.manage_profile.display_name'),
          control: ProfileFieldControl.Text,
          initialValue: profile.displayName,
          placeholder: strings(
            'app_settings.manage_profile.display_name_placeholder',
          ),
          maxLength: PROFILE_FIELD_MAX_LENGTH.displayName,
        };
      case EditableField.Bio:
        return {
          title: strings('app_settings.manage_profile.bio'),
          label: strings('app_settings.manage_profile.bio'),
          control: ProfileFieldControl.TextArea,
          initialValue: profile.bio,
          placeholder: strings('app_settings.manage_profile.bio_placeholder'),
        };
      case EditableField.TradingActivity:
        return {
          title: strings('app_settings.manage_profile.trading_activity'),
          label: strings('app_settings.manage_profile.show_trading_activity'),
          control: ProfileFieldControl.Switch,
          initialValue: profile.isTradingActivityVisible,
          describeValue: (isOn: boolean) =>
            isOn
              ? strings('app_settings.manage_profile.trading_activity_public')
              : strings('app_settings.manage_profile.trading_activity_private'),
          helperText: strings(
            'app_settings.manage_profile.trading_activity_footnote',
          ),
          appliesImmediately: true,
        };
      default:
        return null;
    }
  }, [editingField, profile]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={ManageProfileSelectorsIDs.SAFE_AREA}
    >
      <HeaderStandard
        title={strings('app_settings.manage_profile.header')}
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
              strings('app_settings.manage_profile.avatar_accessibility_label')
            }
            testID={ManageProfileSelectorsIDs.AVATAR}
          />
        </Box>

        <SectionHeader
          title={strings('app_settings.manage_profile.about')}
          titleProps={SECTION_TITLE_PROPS}
          testID={ManageProfileSelectorsIDs.ABOUT_SECTION}
        />
        <Card twClassName="mx-4 overflow-hidden p-0">
          <ProfileRow
            title={strings('app_settings.manage_profile.display_name')}
            value={valueOrPlaceholder(profile.displayName)}
            onPress={handleEditDisplayName}
            testID={ManageProfileSelectorsIDs.DISPLAY_NAME_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('app_settings.manage_profile.handle')}
            value={valueOrPlaceholder(profile.handle)}
            testID={ManageProfileSelectorsIDs.HANDLE_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('app_settings.manage_profile.bio')}
            value={valueOrPlaceholder(profile.bio)}
            valueMaxWidth={BIO_VALUE_MAX_WIDTH}
            onPress={handleEditBio}
            testID={ManageProfileSelectorsIDs.BIO_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('app_settings.manage_profile.socials')}
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
            testID={ManageProfileSelectorsIDs.SOCIALS_ROW}
          />
        </Card>

        <SectionHeader
          title={strings('app_settings.manage_profile.privacy')}
          titleProps={SECTION_TITLE_PROPS}
          testID={ManageProfileSelectorsIDs.PRIVACY_SECTION}
        />
        <Card twClassName="mx-4 overflow-hidden p-0">
          <ProfileRow
            title={strings('app_settings.manage_profile.trading_activity')}
            value={
              profile.isTradingActivityVisible
                ? strings('app_settings.manage_profile.on')
                : strings('app_settings.manage_profile.off')
            }
            valueStartAccessory={
              <Icon
                name={IconName.Lock}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            }
            onPress={handleEditTradingActivity}
            testID={ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW}
          />
          <ProfileRow
            showDivider
            title={strings('app_settings.manage_profile.linked_social_account')}
            value={
              profile.linkedSocialAccountName ||
              strings('app_settings.manage_profile.no_linked_account')
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
            onPress={handleOpenLinkedSocialAccount}
            testID={ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW}
          />
        </Card>
      </ScrollView>

      {sheetProps ? (
        <ManageProfileFieldSheet
          {...sheetProps}
          onSave={handleSaveField}
          onClose={handleCloseSheet}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default ManageProfile;
