import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import AssetIcon from '../AssetIcon';
import Identicon from '../Identicon';

const styles = StyleSheet.create({
	itemLogoWrapper: {
		width: 50,
		height: 50,
		overflow: 'hidden',
		borderRadius: 25,
		marginRight: 20
	}
});

/**
 * View that renders an ERC-20 Token logo
 */
export default class TokenElement extends Component {
	static propTypes = {
		/**
		 * Asset object (in this case ERC20 token)
		 */
		asset: PropTypes.object,
		containerStyle: PropTypes.object,
		iconStyle: PropTypes.object
	};

	render = () => {
		const { asset, containerStyle, iconStyle } = this.props;
		return (
			<View style={[styles.itemLogoWrapper, containerStyle]}>
				{asset.logo ? (
					<AssetIcon logo={asset.logo} customStyle={iconStyle} />
				) : (
					<Identicon address={asset.address} customStyle={iconStyle} />
				)}
			</View>
		);
	};
}
