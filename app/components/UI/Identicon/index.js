import React from 'react';
import PropTypes from 'prop-types';
import { Image, View } from 'react-native';
import { toDataUrl } from '../../../util/blockies.js';
import FadeIn from 'react-native-fade-in-image';
import { colors } from '../../../styles/common.js';
import Jazzicon from 'react-native-jazzicon';
import { connect } from 'react-redux';

/**
 * UI component that renders an Identicon
 * for now it's just a blockie
 * but we could add more types in the future
 */

// eslint-disable-next-line react/display-name
const Identicon = React.memo(props => {
	const { diameter, address, customStyle, noFadeIn, useBlockieIcon } = props;
	if (!address) return null;
	const uri = useBlockieIcon && toDataUrl(address);

	const image = useBlockieIcon ? (
		<Image
			source={{ uri }}
			style={[
				{
					height: diameter,
					width: diameter,
					borderRadius: diameter / 2
				},
				customStyle
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
	return <FadeIn placeholderStyle={{ backgroundColor: colors.white }}>{image}</FadeIn>;
});

Identicon.propTypes = {
	/**
	 * Diameter that represents the size of the identicon
	 */
	diameter: PropTypes.number,
	/**
	 * Address used to render a specific identicon
	 */
	address: PropTypes.string,
	/**
	 * Custom style to apply to image
	 */
	customStyle: PropTypes.object,
	/**
	 * True if render is happening without fade in
	 */
	noFadeIn: PropTypes.bool,
	/**
	 * Show a BlockieIcon instead of JazzIcon
	 */
	useBlockieIcon: PropTypes.bool
};

Identicon.defaultProps = {
	diameter: 46,
	useBlockieIcon: true
};

const mapStateToProps = state => ({
	useBlockieIcon: state.settings.useBlockieIcon
});

export default connect(mapStateToProps)(Identicon);
