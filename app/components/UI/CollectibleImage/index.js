import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import RemoteImage from '../../Base/RemoteImage';
import Identicon from '../Identicon';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	listWrapper: {
		width: 50,
		height: 50,
		borderRadius: 10,
		overflow: 'hidden'
	},
	fullWrapper: {
		width: 260,
		height: 260,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	listImage: {
		width: 50,
		height: 50
	},
	fullImage: {
		height: 260,
		width: 260
	}
});

/**
 * View that renders an ERC-721 Token image
 */
export default class CollectibleImage extends PureComponent {
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

	state = {
		fallbackImage: null
	};

	fallback = () => {
		const {
			collectible: { address, tokenId }
		} = this.props;

		this.setState({ fallbackImage: `https://storage.opensea.io/${address.toLowerCase()}/${tokenId}.png` });
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
					<RemoteImage
						fadeIn
						resizeMode={'contain'}
						placeholderStyle={{ backgroundColor: colors.white }}
						source={{ uri: this.state.fallbackImage || image }}
						style={renderFull ? styles.fullImage : [styles.listImage, iconStyle]}
						onError={this.fallback}
					/>
				) : (
					<Identicon address={address + tokenId} customStyle={iconStyle} />
				)}
			</View>
		);
	};
}
