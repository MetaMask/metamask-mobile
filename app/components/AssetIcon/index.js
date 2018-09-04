import React, { Component } from 'react';
import { StyleSheet } from 'react-native';
import Image from 'react-native-remote-svg';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	stretch: {
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
		const pngPath = 'https://github.com/MetaMask/eth-contract-metadata/raw/master/images/';
		const svgPath = 'https://raw.githubusercontent.com/MetaMask/eth-contract-metadata/master/images/';
		const { logo } = this.props;
		const uri = logo && logo.includes('svg') ? svgPath + logo : pngPath + logo;
		return logo ? <Image source={{ uri }} style={styles.stretch} /> : null;
	}
}
