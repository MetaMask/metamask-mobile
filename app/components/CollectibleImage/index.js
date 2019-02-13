import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import Image from 'react-native-remote-svg';
import Identicon from '../Identicon';

const styles = StyleSheet.create({
	listWrapper: {
		width: 50,
		height: 50,
		borderRadius: 25,
		overflow: 'hidden'
	},
	fullWrapper: {
		width: 200,
		height: 200,
		overflow: 'hidden',
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	listImage: {
		width: 50,
		height: 50
	},
	fullImage: {
		width: 200,
		height: 200
	}
});

/**
 * View that renders an ERC-721 Token image
 */
export default class CollectibleImage extends Component {
	static propTypes = {
		/**
		 * Collectible object (in this case ERC721 token)
		 */
		collectible: PropTypes.object,
		containerStyle: PropTypes.object,
		iconStyle: PropTypes.object,
		/**
		 * Whether collectible image has to render in full size
		 */
		renderFull: PropTypes.bool
	};

	render = () => {
		const {
			collectible: { image, address, tokenId },
			renderFull,
			containerStyle,
			iconStyle
		} = this.props;
		return (
			<View style={renderFull ? styles.fullWrapper : [styles.listWrapper, containerStyle]}>
				{image && image.length !== 0 ? (
					<Image
						source={{ uri: image }}
						style={renderFull ? styles.fullImage : [styles.listImage, iconStyle]}
					/>
				) : (
					<Identicon address={address + tokenId} customStyle={iconStyle} />
				)}
			</View>
		);
	};
}
