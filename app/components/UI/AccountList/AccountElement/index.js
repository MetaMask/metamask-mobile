import React, { PureComponent } from 'react';
import Identicon from '../../Identicon';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { renderFromWei } from '../../../../util/number';
import { getTicker } from '../../../../util/transactions';

const styles = StyleSheet.create({
	account: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
		flexDirection: 'row',
		paddingHorizontal: 20,
		paddingVertical: 20,
		height: 80
	},
	accountInfo: {
		marginLeft: 15,
		marginRight: 0,
		flex: 1,
		flexDirection: 'row'
	},
	accountLabel: {
		fontSize: 18,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	accountBalance: {
		paddingTop: 5,
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	importedView: {
		flex: 0.5,
		alignItems: 'center',
		marginTop: 2
	},
	accountMain: {
		flex: 1,
		flexDirection: 'column'
	},
	selectedWrapper: {
		flex: 0.2,
		alignItems: 'flex-end'
	}
});

/**
 * View that renders specific account element in AccountList
 */
export default class AccountElement extends PureComponent {
	static propTypes = {
		/**
		 * Callback to be called onPress
		 */
		onPress: PropTypes.func.isRequired,
		/**
		 * Callback to be called onLongPress
		 */
		onLongPress: PropTypes.func.isRequired,
		/**
		 * Account index
		 */
		index: PropTypes.number,
		/**
		 * Account address
		 */
		address: PropTypes.string,
		/**
		 * Whether the account is imported
		 */
		imported: PropTypes.object,
		/**
		 * Account balance
		 */
		balance: PropTypes.number,
		/**
		 * Current ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Account name
		 */
		name: PropTypes.string,
		/**
		 * Whether account is selected
		 */
		selected: PropTypes.object
	};

	onPress = () => {
		const { onPress, index } = this.props;
		onPress && onPress(index);
	};

	onLongPress = () => {
		const { onLongPress, index, address, imported } = this.props;
		onLongPress && onLongPress(address, imported, index);
	};

	render() {
		const { address, imported, balance, ticker, selected, name } = this.props;
		return (
			<TouchableOpacity
				style={styles.account}
				key={`account-${address}`}
				onPress={this.onPress}
				onLongPress={this.onLongPress}
			>
				<Identicon address={address} diameter={38} />
				<View style={styles.accountInfo}>
					<View style={styles.accountMain}>
						<Text numberOfLines={1} style={[styles.accountLabel]}>
							{name}
						</Text>
						<Text style={styles.accountBalance}>
							{renderFromWei(balance)} {getTicker(ticker)}
						</Text>
					</View>
					{imported && <View style={styles.importedView}>{imported}</View>}
					<View style={styles.selectedWrapper}>{selected}</View>
				</View>
			</TouchableOpacity>
		);
	}
}
