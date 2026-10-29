import { Icon, IconName, IconSize } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Pressable, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import ProfileAvatar from './ProfileAvatar';

interface EditableProfileAvatarProps {
  imageUrl?: string | null;
  avatarPresetId?: string | null;
  avatarBackgroundId?: string | null;
  diameter?: number;
  onPress: () => void;
  avatarTestID: string;
  editTestID?: string;
  /** The profile screen hides the badge. Edit profile still shows it. */
  showEditIcon?: boolean;
  accessibilityLabel: string;
}

/**
 * Owner avatar with an edit pencil. The pencil is decorative; the whole
 * image is the control.
 */
const EditableProfileAvatar: React.FC<EditableProfileAvatarProps> = ({
  imageUrl,
  avatarPresetId,
  avatarBackgroundId,
  diameter,
  onPress,
  avatarTestID,
  editTestID,
  showEditIcon = true,
  accessibilityLabel,
}) => {
  const tw = useTailwind();
  const editLabel = strings(
    'social_leaderboard.profile_onboarding.edit_avatar',
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${editLabel}. ${accessibilityLabel}`}
      testID={avatarTestID}
      style={tw.style('relative')}
    >
      <ProfileAvatar
        imageUrl={imageUrl}
        avatarPresetId={avatarPresetId}
        avatarBackgroundId={avatarBackgroundId}
        diameter={diameter}
      />
      {showEditIcon ? (
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID={editTestID}
          style={tw.style(
            'absolute bottom-0 right-0 h-6 w-6 items-center justify-center rounded-full border border-muted bg-default',
          )}
        >
          <Icon name={IconName.Edit} size={IconSize.Sm} />
        </View>
      ) : null}
    </Pressable>
  );
};

export default EditableProfileAvatar;
