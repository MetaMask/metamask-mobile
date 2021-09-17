import React, { memo } from 'react';
import { ImageStyle, StyleSheet, StyleProp, ImageSourcePropType } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import { colors } from '../../../styles/common';
import staticLogos from 'images/static-logos';

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
}

const styles = StyleSheet.create({
	logo: {
		width: 50,
		height: 50,
	},
});

function isUrl(string: string) {
	if (/^(http:\/\/|https:\/\/)/.test(string)) {
		return true;
	}
	return false;
}

/**
 * PureComponent that provides an asset icon dependent on OS.
 */
// eslint-disable-next-line react/display-name
const AssetIcon = memo((props: Props) => {
	if (!props.logo || props.logo.substr(0, 4) === 'ipfs') return null;
	const style = [styles.logo, props.customStyle];
	const source: ImageSourcePropType = isUrl(props.logo) ? { uri: props.logo } : (staticLogos as any)[props.logo];

	return <RemoteImage fadeIn placeholderStyle={{ backgroundColor: colors.white }} source={source} style={style} />;
});

export default AssetIcon;
