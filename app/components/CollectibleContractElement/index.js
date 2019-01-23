import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import CollectibleImage from '../CollectibleImage';
import { renderShortAddress } from '../../util/address';

const styles = StyleSheet.create({
	itemWrapper: {
		flex: 1,
		flexDirection: 'row',
		paddingHorizontal: 15,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.borderColor
	},
	rows: {
		flex: 1
	},
	name: {
		fontSize: 16,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	tokenId: {
		fontSize: 12,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	symbol: {
		fontSize: 12,
		color: colors.fontPrimary,
		...fontStyles.bold
	}
});

/**
 * View that renders a CollectibleContract object
 */
export default class CollectibleContractElement extends Component {
	static propTypes = {
		/**
		 * Callback triggered on press
		 */
		onPress: PropTypes.func,
		/**
		 * CollectibleContract object
		 */
		collectibleContract: PropTypes.object,
		/**
		 * Callback triggered on long press
		 */
		onLongPress: PropTypes.func
	};

	handleOnPress = () => {
		const { collectibleContract, onPress } = this.props;
		onPress(collectibleContract);
	};

	handleOnLongPress = () => {
		const { collectibleContract, onLongPress } = this.props;
		onLongPress(collectibleContract);
	};

	render = () => {
		const {
			collectibleContract: { address, logo, name, symbol }
		} = this.props;
		return (
			<TouchableOpacity
				onPress={this.handleOnPress}
				onLongPress={this.handleOnLongPress}
				style={styles.itemWrapper}
				key={`collectible-contract-${address}`}
			>
				<CollectibleImage collectible={{ address, name, image: logo }} />
				<View style={styles.rows}>
					<Text style={styles.name}>{name}</Text>
					<Text style={styles.symbol}>{symbol}</Text>
					<Text style={styles.tokenId}>{renderShortAddress(address)}</Text>
				</View>
			</TouchableOpacity>
		);
	};
}
