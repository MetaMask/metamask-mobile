import React, { Component } from 'react';
import { Image, Platform, StyleSheet } from 'react-native';
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
		const { logo } = this.props;
		return logo && Platform.OS === 'android' ? (
			<Image source={{ uri: `asset:/contract/${logo}` }} style={styles.stretch} />
		) : (
			<Image source={require('../../images/fox.png')} style={styles.stretch} />
		);
	}
}
