/* eslint-disable react/prop-types */
import React, { memo } from 'react';
import { Image, ImageStyle } from 'react-native';
import FadeIn from 'react-native-fade-in-image';
import { useTheme } from '../../../util/theme';
import { useSelector } from 'react-redux';
import AvatarAccount from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { selectAvatarAccountType } from '../../../selectors/settings';

interface IdenticonProps {
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
  customStyle?: ImageStyle;
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
      type={avatarAccountType}
      accountAddress={address}
      size={AvatarSize.Md}
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

  // Unreachable
};

export default memo(Identicon);
