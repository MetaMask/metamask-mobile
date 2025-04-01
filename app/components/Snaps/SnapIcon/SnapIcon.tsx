import React, { FunctionComponent } from 'react';
import { useSelector } from 'react-redux';
import { IconSize } from '../../../component-library/components/Icons/Icon';
import { getAvatarFallbackLetter } from '../SnapUIRenderer/utils';
import AvatarBase from '../../../component-library/components/Avatars/Avatar/foundation/AvatarBase';
import AvatarFavicon from '../../../component-library/components/Avatars/Avatar/variants/AvatarFavicon';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import Text from '../../../component-library/components/Texts/Text';
import { RootState } from '../../../reducers';
import { selectTargetSubjectMetadata } from '../../../selectors/snaps/permissionController';
import { StyleSheet } from 'react-native';
import {
  BackgroundColor,
  JustifyContent,
  AlignItems,
} from '../../UI/Box/box.types';

const styles = StyleSheet.create({
  icon: {
    borderRadius: 50,
    borderWidth: 0,
    width: 24,
    height: 24,
    alignItems: AlignItems.center,
    justifyContent: JustifyContent.center,
  },
});

interface SnapIconProps {
  snapId: string;
  avatarSize?: IconSize;
  borderWidth?: number;
  className?: string;
  badgeBackgroundColor?: BackgroundColor;
}

export const SnapIcon: FunctionComponent<SnapIconProps> = ({
  snapId,
  avatarSize = IconSize.Lg,
  ...props
}) => {
  const subjectMetadata = useSelector((state: RootState) =>
    selectTargetSubjectMetadata(state, snapId),
  );

  const iconUrl = subjectMetadata.iconUrl;
  const snapName = subjectMetadata.name ?? undefined;

  // We choose the first non-symbol char as the fallback icon.
  const fallbackIcon = getAvatarFallbackLetter(snapName);

  return iconUrl ? (
    <AvatarFavicon
      {...props}
      imageSource={{ uri: iconUrl }}
      size={avatarSize as unknown as AvatarSize}
    />
  ) : (
    <AvatarBase
      style={styles.icon}
      {...props}
      size={avatarSize as unknown as AvatarSize}
    >
      <Text>{fallbackIcon}</Text>
    </AvatarBase>
  );
};
