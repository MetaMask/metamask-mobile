import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Image, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, fontStyles } from '../../styles/common';
import TokenImage from '../TokenImage';

const styles = StyleSheet.create({
	itemWrapper: {
		flex: 1,
		flexDirection: 'row',
		paddingHorizontal: 15,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.borderColor
	},
	balances: {
		flex: 1,
		justifyContent: 'center'
	},
	balance: {
		fontSize: 16,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	balanceFiat: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	arrow: {
		flex: 1,
		alignSelf: 'flex-end'
	},
	arrowIcon: {
		marginTop: 8
	},
	ethLogo: {
		width: 50,
		height: 50,
		overflow: 'hidden',
		marginRight: 20
	}
});

const ethLogo = require('../../images/eth-logo.png'); // eslint-disable-line

/**
 * View that renders an ERC-20 Token list element
 */
export default class TokenElement extends PureComponent {
	static propTypes = {
		/**
		 * Callback triggered on press
		 */
		onPress: PropTypes.func,
		/**
		 * Asset object (in this case ERC20 token)
		 */
		token: PropTypes.object,
		/**
		 * Callback triggered on long press
		 */
		onLongPress: PropTypes.func
	};

	handleOnPress = () => {
		const { token, onPress } = this.props;
		onPress(token);
	};

	handleOnLongPress = () => {
		const { token, onLongPress } = this.props;
		onLongPress(token);
	};

	render = () => {
		const {
			token,
			token: { symbol, balance, balanceFiat }
		} = this.props;

		return (
			<TouchableOpacity
				onPress={this.handleOnPress}
				onLongPress={this.handleOnLongPress}
				style={styles.itemWrapper}
			>
				{token.symbol === 'ETH' ? (
					<Image source={ethLogo} style={styles.ethLogo} />
				) : (
					<TokenImage asset={token} />
				)}
				<View style={styles.balances}>
					<Text style={styles.balance}>
						{balance} {symbol}
					</Text>
					{balanceFiat ? <Text style={styles.balanceFiat}>{balanceFiat}</Text> : null}
				</View>
				<View styles={styles.arrow}>
					<Icon name="ios-arrow-forward" size={24} color={colors.fontTertiary} style={styles.arrowIcon} />
				</View>
			</TouchableOpacity>
		);
	};
}
