import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import AssetIcon from '../AssetIcon';
import Identicon from '../Identicon';
import contractMap from 'eth-contract-metadata';
import { toChecksumAddress } from 'ethereumjs-util';

const styles = StyleSheet.create({
	itemLogoWrapper: {
		width: 50,
		height: 50
	},
	roundImage: {
		overflow: 'hidden',
		borderRadius: 25
	}
});

/**
 * View that renders an ERC-20 Token logo
 */
export default class TokenElement extends Component {
	static propTypes = {
		/**
		 * Asset object
		 */
		asset: PropTypes.object,
		/**
		 * Style to apply to main view
		 */
		containerStyle: PropTypes.object,
		/**
		 * Style to apply to image
		 */
		iconStyle: PropTypes.object,
		/**
		 * Whether logo is defined in asset, logo could be undefined
		 */
		logoDefined: PropTypes.bool
	};

	shouldComponentUpdate(nextProps) {
		return nextProps.asset.address !== this.props.asset.address;
	}

	render = () => {
		const { asset, containerStyle, iconStyle, logoDefined } = this.props;
		if (!logoDefined && !asset.logo) {
			const checksumAddress = toChecksumAddress(asset.address);
			if (checksumAddress in contractMap) {
				asset.logo = contractMap[checksumAddress].logo;
			}
		}
		// When image is defined, is coming from a token added by watchAsset, so it has to be handled alone
		const watchedAsset = asset.image !== undefined;
		return (
			<View style={[styles.itemLogoWrapper, containerStyle, asset.logo || asset.image ? {} : styles.roundImage]}>
				{asset.logo || asset.image ? (
					<AssetIcon watchedAsset={watchedAsset} logo={asset.image || asset.logo} customStyle={iconStyle} />
				) : (
					<Identicon address={asset.address} customStyle={iconStyle} />
				)}
			</View>
		);
	};
}
