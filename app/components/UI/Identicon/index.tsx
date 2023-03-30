import React from 'react';
import { Image, ImageStyle, View } from 'react-native';
import { toDataUrl } from '../../../util/blockies';
import FadeIn from 'react-native-fade-in-image';
import Jazzicon from 'react-native-jazzicon';
import { connect } from 'react-redux';
import { useTheme } from '../../../util/theme';

interface IdenticonProps {
  diameter: number;
  address: string;
  customStyle?: ImageStyle;
  noFadeIn?: boolean;
  useBlockieIcon: boolean;
}

/**
 * UI component that renders an Identicon
 * for now it's just a blockie
 * but we could add more types in the future
 */

// eslint-disable-next-line react/display-name
const Identicon = React.memo((props: IdenticonProps) => {
  const {
    diameter = 46,
    address,
    customStyle,
    noFadeIn,
    useBlockieIcon = true,
  } = props;
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
});

const mapStateToProps = (state: any) => ({
  useBlockieIcon: state.settings.useBlockieIcon,
});

export default connect(mapStateToProps)(Identicon);
