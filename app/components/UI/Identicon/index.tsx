/* eslint-disable react/prop-types */
import React, { memo } from 'react';
import { Image, ImageStyle, View } from 'react-native';
import { toDataUrl } from '../../../util/blockies';
import FadeIn from 'react-native-fade-in-image';
import Jazzicon from 'react-native-jazzicon';
import { useTheme } from '../../../util/theme';
import { RootState } from '../../../reducers';
import { useSelector } from 'react-redux';

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
  // TODO: Figure out what to do with this file
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useBlockieIcon =
    useSelector((state: RootState) => state.settings.useBlockieIcon) ?? true;

  if (!address && !imageUri) return null;

  const styleForBlockieAndTokenIcon = [
    {
      height: diameter,
      width: diameter,
      borderRadius: diameter / 2,
    },
    customStyle,
  ];

  const image = imageUri ? (
    <Image source={{ uri: imageUri }} style={styleForBlockieAndTokenIcon} />
  ) : useBlockieIcon ? (
    <Image
      source={{ uri: toDataUrl(address) }}
      style={styleForBlockieAndTokenIcon}
    />
  ) : (
    <View style={customStyle}>
      <Jazzicon size={diameter} address={address} />
    </View>
  );

  if (noFadeIn) {
    return image;
  }

  return (
    <FadeIn
      placeholderStyle={{ backgroundColor: colors.background.alternative }}
    >
      {image}
    </FadeIn>
  );
};

export default memo(Identicon);
