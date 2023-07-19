/* eslint-disable react/prop-types */
import React, { memo } from 'react';
import { Image, ImageStyle, View } from 'react-native';
import { toDataUrl } from '../../../util/blockies';
import FadeIn from 'react-native-fade-in-image';
import Jazzicon from 'react-native-jazzicon';
import { connect } from 'react-redux';
import { useTheme } from '../../../util/theme';

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
   * Show a BlockieIcon instead of JazzIcon
   */
  useBlockieIcon?: boolean;
}

const Identicon: React.FC<IdenticonProps> = ({
  diameter = 46,
  address,
  customStyle,
  noFadeIn,
  useBlockieIcon = true,
}) => {
  const { colors } = useTheme();

  if (!address) return null;

  const uri = useBlockieIcon && toDataUrl(address);

  const image = useBlockieIcon ? (
    <Image
      source={{ uri }}
      style={[
        {
          height: diameter,
          width: diameter,
          borderRadius: diameter / 2,
        },
        customStyle,
      ]}
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

const mapStateToProps = (state: any) => ({
  useBlockieIcon: state.settings.useBlockieIcon,
});

export default connect(mapStateToProps)(memo(Identicon));
