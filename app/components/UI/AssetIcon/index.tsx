import React, { memo } from 'react';
import {
  ImageStyle,
  StyleSheet,
  StyleProp,
  ImageSourcePropType,
} from 'react-native';
import isUrl from 'is-url';
import RemoteImage from '../../Base/RemoteImage';
import { useTheme } from '../../../util/theme';

interface Props {
  /**
   * URL of the logo
   */
  logo: string;
  /**
   * Custom style to apply to image
   */
  customStyle?: StyleProp<ImageStyle>;
  /**
   * Token address
   */
  address?: string;
}

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const source: ImageSourcePropType | null = isImageUrl
    ? { uri: props.logo }
    : null;

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
