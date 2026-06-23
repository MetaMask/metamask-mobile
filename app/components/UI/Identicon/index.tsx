/* eslint-disable react/prop-types */
import React, { memo } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import FadeIn from 'react-native-fade-in-image';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../util/theme';
import { useSelector } from 'react-redux';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount/AvatarAccount.types';
import { selectAvatarAccountType } from '../../../selectors/settings';

const AVATAR_SIZE_TO_ACCOUNT_SIZE: Record<AvatarSize, AvatarAccountSize> = {
  [AvatarSize.Xs]: AvatarAccountSize.Xs,
  [AvatarSize.Sm]: AvatarAccountSize.Sm,
  [AvatarSize.Md]: AvatarAccountSize.Md,
  [AvatarSize.Lg]: AvatarAccountSize.Lg,
  [AvatarSize.Xl]: AvatarAccountSize.Xl,
};

const AVATAR_ACCOUNT_TYPE_TO_VARIANT: Record<
  AvatarAccountType,
  AvatarAccountVariant
> = {
  [AvatarAccountType.JazzIcon]: AvatarAccountVariant.Jazzicon,
  [AvatarAccountType.Blockies]: AvatarAccountVariant.Blockies,
  [AvatarAccountType.Maskicon]: AvatarAccountVariant.Maskicon,
};

interface IdenticonProps {
  /**
   * Optional size of the avatar
   */
  avatarSize?: AvatarSize;
  /**
   * Diameter that represents the size of the identicon
   */
  diameter?: number;
  /**
   * Address used to render a specific identicon
   */
  address?: string;
  /**
   * Custom style to apply to image
   */
  customStyle?: StyleProp<ImageStyle>;
  /**
   * True if render is happening without fade in
   */
  noFadeIn?: boolean;
  /**
   * URI of the image to render
   * Overrides the address if also provided
   */
  imageUri?: string;
}

/**
 * UI component that renders an Identicon
 * for now it's just a blockie
 * but we could add more types in the future
 */
const Identicon: React.FC<IdenticonProps> = ({
  avatarSize = AvatarSize.Md,
  diameter = 46,
  address,
  customStyle,
  noFadeIn,
  imageUri,
}) => {
  const { colors } = useTheme();
  const avatarAccountType = useSelector(selectAvatarAccountType);

  if (!address && !imageUri) return null;

  const styleForBlockieAndTokenIcon = [
    {
      height: diameter,
      width: diameter,
      borderRadius: diameter / 2,
    },
    customStyle,
  ];

  if (imageUri) {
    return noFadeIn ? (
      <Image source={{ uri: imageUri }} style={styleForBlockieAndTokenIcon} />
    ) : (
      <FadeIn
        placeholderStyle={{ backgroundColor: colors.background.alternative }}
      >
        <Image source={{ uri: imageUri }} style={styleForBlockieAndTokenIcon} />
      </FadeIn>
    );
  }

  if (!address) return null;

  const avatar = (
    <AvatarAccount
      variant={AVATAR_ACCOUNT_TYPE_TO_VARIANT[avatarAccountType]}
      address={address}
      size={AVATAR_SIZE_TO_ACCOUNT_SIZE[avatarSize]}
    />
  );

  if (noFadeIn) return avatar;

  return (
    <FadeIn
      placeholderStyle={{ backgroundColor: colors.background.alternative }}
    >
      {avatar}
    </FadeIn>
  );
};

export default memo(Identicon);
