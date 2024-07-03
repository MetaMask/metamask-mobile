/* eslint-disable react/prop-types */
import React, { memo } from 'react';
import { Image, ImageStyle, View } from 'react-native';
import { toDataUrl } from '../../../util/blockies';
import FadeIn from 'react-native-fade-in-image';
import Jazzicon from 'react-native-jazzicon';
import { connect } from 'react-redux';
import { useTheme } from '../../../util/theme';
import { useTokenListEntry } from '../../../components/hooks/DisplayName/useTokenListEntry';
import { NameType } from '../../UI/Name/Name.types';

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
  useBlockieIcon = true,
}) => {
  const { colors } = useTheme();
  const tokenListIcon = useTokenListEntry(
    address || '',
    NameType.EthereumAddress,
  )?.iconUrl;

  if (!address) return null;

  const uri = useBlockieIcon && toDataUrl(address);

  const styleForBlockieAndTokenIcon = [
    {
      height: diameter,
      width: diameter,
      borderRadius: diameter / 2,
    },
    customStyle,
  ];

  if (tokenListIcon) {
    return (
      <Image
        source={{ uri: tokenListIcon }}
        style={styleForBlockieAndTokenIcon}
      />
    );
  }

  const image = useBlockieIcon ? (
    <Image source={{ uri }} style={styleForBlockieAndTokenIcon} />
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
