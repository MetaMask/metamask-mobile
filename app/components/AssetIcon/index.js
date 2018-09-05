import React, { Component } from 'react';
import { StyleSheet } from 'react-native';
import Image from 'react-native-remote-svg';
import PropTypes from 'prop-types';
import getAssetLogoPath from '../../util/assets';

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
		logo: PropTypes.string
	};

	render() {
		const { logo } = this.props;
		if (!logo) return;
		const uri = getAssetLogoPath(logo);
		return logo ? <Image source={{ uri }} style={styles.logo} /> : null;
	}
}
