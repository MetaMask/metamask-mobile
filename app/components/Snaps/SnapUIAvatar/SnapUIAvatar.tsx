import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';
import { selectAvatarStyle } from '../../../selectors/settings';
import AvatarAccount from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';

export const DIAMETERS: Record<string, number> = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 40,
};

export interface SnapUIAvatarProps {
  // The address must be a CAIP-10 string.
  address: string;
  size?: AvatarSize;
}

export const SnapUIAvatar: React.FunctionComponent<SnapUIAvatarProps> = ({
  address,
  size = AvatarSize.Md,
}) => {
  const parsed = useMemo(
    () => parseCaipAccountId(address as CaipAccountId),
    [address],
  );
  const avatarStyle = useSelector(selectAvatarStyle);

  return (
    <AvatarAccount
      type={avatarStyle}
      accountAddress={parsed.address}
      size={size}
    />
  );
};
