import React, { Component } from 'react';
import { StyleSheet } from 'react-native';
import Image from 'react-native-remote-svg';
import PropTypes from 'prop-types';
import getAssetLogoPath from '../../util/assets';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	logo: {
		width: 50,
		height: 50
	}
});

/**
 * Component that provides an asset icon dependent on OS.
 */
export default class AssetIcon extends Component {
	state = {
		searchQuery: ''
	};

	static propTypes = {
		/**
		 * String of the asset icon
		 */
		logo: PropTypes.string,
		/**
		 * Custom style to apply to image
		 */
		customStyle: PropTypes.object
	};

	shouldComponentUpdate(nextProps) {
		return nextProps.logo !== this.props.logo;
	}

	render = () => {
		const { logo, customStyle } = this.props;
		if (!logo) return;
		const uri = getAssetLogoPath(logo);

		return logo ? (
			<Image
				fadeIn
				placeholderStyle={{ backgroundColor: colors.white }}
				source={{ uri }}
				style={[styles.logo, customStyle]}
			/>
		) : null;
	};
}
