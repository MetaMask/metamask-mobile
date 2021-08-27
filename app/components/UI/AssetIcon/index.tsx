import React, { memo } from 'react';
import { ImageStyle, StyleSheet } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import getAssetLogoPath from '../../../util/assets';
import { colors } from '../../../styles/common';
import { StyleProp } from 'react-native';

type Props = {
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
};

const styles = StyleSheet.create({
	logo: {
		width: 50,
		height: 50
	}
});

/**
 * PureComponent that provides an asset icon dependent on OS.
 */
// eslint-disable-next-line react/display-name
const AssetIcon = memo((props: Props) => {
	if (!props.logo) return null;
	const uri = props.watchedAsset ? props.logo : getAssetLogoPath(props.logo);
	const style = [styles.logo, props.customStyle];
	return <RemoteImage fadeIn placeholderStyle={{ backgroundColor: colors.white }} source={{ uri }} style={style} />;
});

export default AssetIcon;
