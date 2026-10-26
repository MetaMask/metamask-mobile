import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, ScrollView } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  DEFAULT_PROFILE_AVATAR_PRESET_ID,
  getProfileAvatarBackground,
  getProfileAvatarPreset,
  toFoxiconAvatarUrl,
} from '../../MyProfileView/avatarPresets';
import { useMyProfile } from '../../MyProfileView/hooks';
import ProfileAvatarPicker from '../../ProfileOnboarding/ProfileAvatarPicker';
import ManageProfileScreenChrome from '../components/ManageProfileScreenChrome';
import { useProfileController } from '../hooks/useProfileController';
import { canSaveProfileAvatarEdit } from './canSaveProfileAvatarEdit';
import { EditProfileAvatarSelectorsIDs } from './EditProfileAvatarView.testIds';

/** Screen for changing the signed-in profile avatar. */
const EditProfileAvatarView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const { profile } = useMyProfile();
  const { isControllerBacked, updateProfile } = useProfileController();
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const canSave = canSaveProfileAvatarEdit(networkTier);
  const isLowTier = hardwareTier === 'LOW';
  const [avatarPresetId, setAvatarPresetId] = useState(
    () =>
      getProfileAvatarPreset(profile?.avatarPresetId)?.id ??
      DEFAULT_PROFILE_AVATAR_PRESET_ID,
  );
  const [avatarBackgroundId, setAvatarBackgroundId] = useState(
    () =>
      getProfileAvatarBackground(profile?.avatarBackgroundId)?.id ??
      DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(errorMessage);
  }, [errorMessage]);

  const handleSelectPreset = useCallback((presetId: string) => {
    const preset = getProfileAvatarPreset(presetId);
    if (!preset) {
      return;
    }
    setAvatarPresetId(preset.id);
  }, []);

  const handleSelectBackground = useCallback((backgroundId: string) => {
    const background = getProfileAvatarBackground(backgroundId);
    if (!background) {
      return;
    }
    setAvatarBackgroundId(background.id);
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!isControllerBacked || !canSave) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await updateProfile({
        avatar_url: toFoxiconAvatarUrl(avatarPresetId, avatarBackgroundId),
      });
      navigation.goBack();
    } catch {
      setErrorMessage(strings('social_leaderboard.manage_profile.save_error'));
    } finally {
      setIsSaving(false);
    }
  }, [
    avatarBackgroundId,
    avatarPresetId,
    canSave,
    isControllerBacked,
    navigation,
    updateProfile,
  ]);

  return (
    <ManageProfileScreenChrome
      title={strings('social_leaderboard.profile_onboarding.customize_avatar')}
      testID={EditProfileAvatarSelectorsIDs.CONTAINER}
      headerTestID={EditProfileAvatarSelectorsIDs.HEADER}
      backTestID={EditProfileAvatarSelectorsIDs.BACK_BUTTON}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('flex-grow px-4 pb-6')}
      >
        <ProfileAvatarPicker
          avatarPresetId={avatarPresetId}
          avatarBackgroundId={avatarBackgroundId}
          onSelectPreset={handleSelectPreset}
          onSelectBackground={handleSelectBackground}
          isLowTier={isLowTier}
        />
      </ScrollView>
      <Box twClassName="px-4 pb-4">
        {errorMessage ? (
          <Text
            accessibilityLiveRegion="polite"
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="text-center pb-3"
            testID={EditProfileAvatarSelectorsIDs.ERROR}
          >
            {errorMessage}
          </Text>
        ) : null}
        <Button
          variant={ButtonVariant.Primary}
          isFullWidth
          isDisabled={!isControllerBacked || !canSave}
          isLoading={isSaving}
          onPress={() => {
            handleSave().catch(() => undefined);
          }}
          testID={EditProfileAvatarSelectorsIDs.SAVE_BUTTON}
        >
          {strings('social_leaderboard.manage_profile.save')}
        </Button>
      </Box>
    </ManageProfileScreenChrome>
  );
};

export default EditProfileAvatarView;
