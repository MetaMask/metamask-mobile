import { Box, BoxAlignItems } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Foxicon from '../../../../component-library/components-temp/Foxicon';
import { useHaptics } from '../../../../util/haptics';
import { PROFILE_AVATAR_PRESETS } from '../MyProfileView/avatarPresets';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import AvatarBackgroundCarousel from './AvatarBackgroundCarousel';

const AVATAR_TILE_SIZE = 60;
/** Width of four 60pt tiles with 20pt gaps. */
const AVATAR_GRID_WIDTH = 300;

interface ProfileAvatarPickerProps {
  avatarPresetId: string;
  avatarBackgroundId: string;
  onSelectPreset: (presetId: string) => void;
  onSelectBackground: (backgroundId: string) => void;
  /**
   * Skips the carousel entrance glide and glow on LOW hardware.
   */
  isLowTier?: boolean;
}

/**
 * Avatar and background picker shared by onboarding and profile edits.
 */
const ProfileAvatarPicker: React.FC<ProfileAvatarPickerProps> = ({
  avatarPresetId,
  avatarBackgroundId,
  onSelectPreset,
  onSelectBackground,
  isLowTier,
}) => {
  const tw = useTailwind();
  const { playSelection } = useHaptics();

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      if (presetId === avatarPresetId) {
        return;
      }
      playSelection().catch(() => undefined);
      onSelectPreset(presetId);
    },
    [avatarPresetId, onSelectPreset, playSelection],
  );

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      testID={SocialProfileOnboardingSelectorsIDs.AVATAR_STEP}
    >
      <AvatarBackgroundCarousel
        avatarPresetId={avatarPresetId}
        selectedBackgroundId={avatarBackgroundId}
        onSelect={onSelectBackground}
        isLowTier={isLowTier}
      />
      <Box
        twClassName="flex-row flex-wrap justify-center gap-5 mt-11"
        style={tw.style({ width: AVATAR_GRID_WIDTH })}
      >
        {PROFILE_AVATAR_PRESETS.map((preset, index) => {
          const isSelected = avatarPresetId === preset.id;
          return (
            <Pressable
              key={preset.id}
              accessibilityLabel={strings(
                'social_leaderboard.profile_onboarding.avatar_option_accessibility_label',
                { number: index + 1, total: PROFILE_AVATAR_PRESETS.length },
              )}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => handleSelectPreset(preset.id)}
              testID={`${SocialProfileOnboardingSelectorsIDs.AVATAR_OPTION}-${preset.id}`}
              style={tw.style(
                'items-center justify-center rounded-full border',
                isSelected ? 'border-icon-default' : 'border-muted',
                {
                  width: AVATAR_TILE_SIZE,
                  height: AVATAR_TILE_SIZE,
                },
              )}
            >
              <Foxicon variant={preset.id} size={AVATAR_TILE_SIZE * 0.85} />
            </Pressable>
          );
        })}
      </Box>
    </Box>
  );
};

export default ProfileAvatarPicker;
