import React, { memo } from 'react';
import {
  ImageStyle,
  StyleSheet,
  StyleProp,
  ImageSourcePropType,
} from 'react-native';
import isUrl from 'is-url';
import RemoteImage from '../../Base/RemoteImage';
import staticLogos from 'images/static-logos';
import { useTheme } from '../../../util/theme';

interface Props {
  /**
   * String of the asset icon to be searched in contractMap
   */
  logo: string;
  /**
   * Whether logo has to be fetched from @metamask/contract-metadata
   */
  watchedAsset?: boolean;
  /**
   * Custom style to apply to image
   */
  customStyle?: StyleProp<ImageStyle>;
  /**
   * Token address
   */
  address?: string;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    logo: {
      width: 50,
      height: 50,
      borderRadius: 25,
      overflow: 'hidden',
    },
    placeholder: { backgroundColor: colors.background.alternative },
  });

/**
 * PureComponent that provides an asset icon dependent on OS.
 */
// eslint-disable-next-line react/display-name
const AssetIcon = memo((props: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  if (!props.logo) return null;

  const style = [styles.logo, props.customStyle];
  const isImageUrl = isUrl(props.logo) || props.logo.substr(0, 4) === 'ipfs';
  const source: ImageSourcePropType = isImageUrl
    ? { uri: props.logo }
    : (staticLogos as any)[props.logo];

  if (!source) {
    return null;
  }

  return (
    <RemoteImage
      key={props.logo}
      address={props.address}
      fadeIn
      placeholderStyle={styles.placeholder}
      source={source}
      style={style}
    />
  );
});

export default AssetIcon;
