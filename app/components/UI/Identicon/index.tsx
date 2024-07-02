/* eslint-disable react/prop-types */
import React, { memo } from 'react';
import { Image, ImageStyle, View } from 'react-native';
import { TokenListToken } from '@metamask/assets-controllers';
import { toDataUrl } from '../../../util/blockies';
import FadeIn from 'react-native-fade-in-image';
import Jazzicon from 'react-native-jazzicon';
import { connect } from 'react-redux';
import { useTheme } from '../../../util/theme';
import useTokenList from '../../../components/hooks/DisplayName/useTokenList';

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
  const tokenListArray: TokenListToken[] = useTokenList();
  const normalizedAddress = address?.toLowerCase();
  const tokenListIcon = tokenListArray.find(
    (token: TokenListToken) => token.address === normalizedAddress,
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

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapStateToProps = (state: any) => ({
  useBlockieIcon: state.settings.useBlockieIcon,
});

export default connect(mapStateToProps)(memo(Identicon));
