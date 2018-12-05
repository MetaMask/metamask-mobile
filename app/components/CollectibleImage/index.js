import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import Image from 'react-native-remote-svg';
import Identicon from '../Identicon';

const styles = StyleSheet.create({
	imageWrapper: {
		width: 50,
		height: 50,
		overflow: 'hidden',
		borderRadius: 100,
		marginRight: 20
	},
	image: {
		width: 50,
		height: 50
	}
});

/**
 * View that renders an ERC-721 Token image
 */
export default class CollectibleImage extends Component {
	static propTypes = {
		/**
		 * Asset object (in this case ERC721 token)
		 */
		asset: PropTypes.object
	};

	render = () => {
		const { asset } = this.props;
		return (
			<View style={styles.imageWrapper}>
				{asset.image && asset.image.length !== 0 ? (
					<Image source={{ uri: asset.image }} style={styles.image} />
				) : (
					<Identicon address={asset.address + asset.tokenId} />
				)}
			</View>
		);
	};
}
