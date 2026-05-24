import React, { FunctionComponent, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { IconSize } from '../../../component-library/components/Icons/Icon';
import { getAvatarFallbackLetter } from '../SnapUIRenderer/utils';
import AvatarFavicon from '../../../component-library/components/Avatars/Avatar/variants/AvatarFavicon';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import { RootState } from '../../../reducers';
import { selectTargetSubjectMetadata } from '../../../selectors/snaps/permissionController';
import { BackgroundColor } from '../../UI/Box/box.types';

function mapIconSizeToAvatarBaseSize(iconSize: IconSize): AvatarBaseSize {
  const pixels = Number(iconSize);
  if (pixels <= 16) {
    return AvatarBaseSize.Xs;
  }
  if (pixels <= 24) {
    return AvatarBaseSize.Sm;
  }
  if (pixels <= 32) {
    return AvatarBaseSize.Md;
  }
  if (pixels <= 40) {
    return AvatarBaseSize.Lg;
  }
  return AvatarBaseSize.Xl;
}

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
  ...faviconProps
}) => {
  const subjectMetadata = useSelector((state: RootState) =>
    selectTargetSubjectMetadata(state, snapId),
  );

  const iconUrl = subjectMetadata.iconUrl;
  const snapName = subjectMetadata.name ?? undefined;

  // We choose the first non-symbol char as the fallback icon.
  const fallbackIcon = getAvatarFallbackLetter(snapName);

  const avatarTwClassName = useMemo(() => {
    const pixels = Number(avatarSize);
    return `size-[${pixels}px] rounded-full border-0`;
  }, [avatarSize]);

  return iconUrl ? (
    <AvatarFavicon
      {...faviconProps}
      imageSource={{ uri: iconUrl }}
      size={avatarSize as unknown as AvatarSize}
    />
  ) : (
    <AvatarBase
      fallbackText={fallbackIcon}
      shape={AvatarBaseShape.Circle}
      size={mapIconSizeToAvatarBaseSize(avatarSize)}
      twClassName={avatarTwClassName}
    />
  );
};
