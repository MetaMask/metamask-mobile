import React from 'react';
import { StyleSheet } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import PropTypes from 'prop-types';
import { colors } from '../../../styles/common';
import staticLogos from 'images/static-logos';

const styles = StyleSheet.create({
	logo: {
		width: 50,
		height: 50
	}
});

function isUrl(string) {
	if (/^(http:\/\/|https:\/\/)/.test(string)) {
		return true;
	}
	return false;
}

/**
 * PureComponent that provides an asset icon dependent on OS.
 */
// eslint-disable-next-line react/display-name
const AssetIcon = React.memo(props => {
	if (!props.logo) return null;
	const style = [styles.logo, props.customStyle];
	const source = isUrl(props.logo) ? { uri: props.logo } : staticLogos[props.logo];

	return <RemoteImage fadeIn placeholderStyle={{ backgroundColor: colors.white }} source={source} style={style} />;
});

AssetIcon.propTypes = {
	/**
	 * String of the asset icon to be searched in contractMap
	 */
	logo: PropTypes.string,
	/**
	 * Custom style to apply to image
	 */
	customStyle: PropTypes.object
};

export default AssetIcon;
