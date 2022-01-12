import React, { memo } from 'react';
import { ImageStyle, StyleSheet, StyleProp, ImageSourcePropType } from 'react-native';
import isUrl from 'is-url';
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
		borderRadius: 25,
		overflow: 'hidden',
	},
	placeholder: { backgroundColor: colors.white },
});

/**
 * PureComponent that provides an asset icon dependent on OS.
 */
// eslint-disable-next-line react/display-name
const AssetIcon = memo((props: Props) => {
	if (!props.logo) return null;
	const style = [styles.logo, props.customStyle];
	const isImageUrl = isUrl(props.logo) || props.logo.substr(0, 4) === 'ipfs';
	const source: ImageSourcePropType = isImageUrl ? { uri: props.logo } : (staticLogos as any)[props.logo];

	if (!source) {
		return null;
	}

	return <RemoteImage fadeIn placeholderStyle={styles.placeholder} source={source} style={style} />;
});

export default AssetIcon;
