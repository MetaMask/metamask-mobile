import React from 'react';
import { StyleSheet } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import PropTypes from 'prop-types';
import getAssetLogoPath from '../../../util/assets';
import { colors } from '../../../styles/common';

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
const AssetIcon = React.memo(props => {
	if (!props.logo) return null;
	const uri = props.watchedAsset ? props.logo : getAssetLogoPath(props.logo);
	const style = [styles.logo, props.customStyle];
	return <RemoteImage fadeIn placeholderStyle={{ backgroundColor: colors.white }} source={{ uri }} style={style} />;
});

AssetIcon.propTypes = {
	/**
	 * String of the asset icon to be searched in contractMap
	 */
	logo: PropTypes.string,
	/**
	 * Whether logo has to be fetched from eth-contract-metadata
	 */
	watchedAsset: PropTypes.bool,
	/**
	 * Custom style to apply to image
	 */
	customStyle: PropTypes.object
};

export default AssetIcon;
