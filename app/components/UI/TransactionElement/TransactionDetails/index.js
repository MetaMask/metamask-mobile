import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Clipboard, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import Icon from 'react-native-vector-icons/FontAwesome';

const styles = StyleSheet.create({
	detailRowWrapper: {
		flex: 1,
		backgroundColor: colors.concrete,
		paddingVertical: 10,
		paddingHorizontal: 15,
		marginTop: 10
	},
	detailRowTitle: {
		flex: 1,
		paddingVertical: 10,
		fontSize: 15,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	detailRowInfo: {
		borderRadius: 5,
		shadowColor: colors.accentGray,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 3,
		backgroundColor: colors.white,
		padding: 10,
		marginBottom: 5
	},
	detailRowInfoItem: {
		flex: 1,
		flexDirection: 'row',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor,
		marginBottom: 10,
		paddingBottom: 5
	},
	noBorderBottom: {
		borderBottomWidth: 0
	},
	detailRowText: {
		flex: 1,
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	alignLeft: {
		textAlign: 'left',
		width: '40%'
	},
	alignRight: {
		textAlign: 'right',
		width: '60%'
	},
	viewOnEtherscan: {
		fontSize: 14,
		color: colors.primary,
		...fontStyles.normal,
		textAlign: 'center',
		marginTop: 15,
		marginBottom: 10
	},
	hash: {
		fontSize: 12
	},
	singleRow: {
		flexDirection: 'row'
	},
	copyIcon: {
		paddingRight: 5
	}
});

/**
 * View that renders a transaction details as part of transactions list
 */
export default class TransactionDetails extends PureComponent {
	static propTypes = {
		/**
		 * Object corresponding to a transaction, containing transaction object, networkId and transaction hash string
		 */
		transactionObject: PropTypes.object,
		/**
		 * Boolean to determine if this network supports a block explorer
		 */
		blockExplorer: PropTypes.bool,
		/**
		 * Action that shows the global alert
		 */
		showAlert: PropTypes.func,
		/**
		 * Action that shows the global alert
		 */
		viewOnEtherscan: PropTypes.func,
		/**
		 * Object with information to render
		 */
		transactionDetails: PropTypes.object
	};

	renderTxHash = transactionHash => {
		if (!transactionHash) return null;
		return (
			<View>
				<Text style={styles.detailRowTitle}>{strings('transactions.hash')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<Text style={[styles.detailRowText, styles.hash]}>{`${transactionHash.substr(
						0,
						20
					)} ... ${transactionHash.substr(-20)}`}</Text>
					{this.renderCopyIcon(transactionHash)}
				</View>
			</View>
		);
	};

	copy = async () => {
		await Clipboard.setString(this.props.transactionDetails.transactionHash);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('transactions.hash_copied_to_clipboard') }
		});
	};

	renderCopyIcon = () => (
		<TouchableOpacity style={styles.copyIcon} onPress={this.copy}>
			<Icon name={'copy'} size={15} color={colors.primary} />
		</TouchableOpacity>
	);

	viewOnEtherscan = () => {
		const {
			transactionObject: { networkID }
		} = this.props;
		this.props.viewOnEtherscan(networkID, this.props.transactionDetails.transactionHash);
	};

	render = () => {
		const { blockExplorer } = this.props;

		return (
			<View style={styles.detailRowWrapper}>
				{this.renderTxHash(this.props.transactionDetails.transactionHash)}
				<Text style={styles.detailRowTitle}>{strings('transactions.from')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<Text style={styles.detailRowText}>{this.props.transactionDetails.renderFrom}</Text>
				</View>
				<Text style={styles.detailRowTitle}>{strings('transactions.to')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<Text style={styles.detailRowText}>{this.props.transactionDetails.renderTo}</Text>
				</View>
				<Text style={styles.detailRowTitle}>{strings('transactions.details')}</Text>
				<View style={styles.detailRowInfo}>
					<View style={styles.detailRowInfoItem}>
						<Text style={[styles.detailRowText, styles.alignLeft]}>
							{this.props.transactionDetails.valueLabel || strings('transactions.amount')}
						</Text>
						<Text style={[styles.detailRowText, styles.alignRight]}>
							{this.props.transactionDetails.renderValue}
						</Text>
					</View>
					<View style={styles.detailRowInfoItem}>
						<Text style={[styles.detailRowText, styles.alignLeft]}>
							{strings('transactions.gas_limit')}
						</Text>
						<Text style={[styles.detailRowText, styles.alignRight]}>
							{this.props.transactionDetails.renderGas}
						</Text>
					</View>
					<View style={styles.detailRowInfoItem}>
						<Text style={[styles.detailRowText, styles.alignLeft]}>
							{strings('transactions.gas_price')}
						</Text>
						<Text style={[styles.detailRowText, styles.alignRight]}>
							{this.props.transactionDetails.renderGasPrice}
						</Text>
					</View>
					<View style={styles.detailRowInfoItem}>
						<Text style={[styles.detailRowText, styles.alignLeft]}>{strings('transactions.total')}</Text>
						<Text style={[styles.detailRowText, styles.alignRight]}>
							{this.props.transactionDetails.renderTotalValue}
						</Text>
					</View>
					{this.props.transactionDetails.renderTotalValueFiat && (
						<View style={[styles.detailRowInfoItem, styles.noBorderBottom]}>
							<Text style={[styles.detailRowText, styles.alignRight]}>
								{this.props.transactionDetails.renderTotalValueFiat}
							</Text>
						</View>
					)}
				</View>
				{this.props.transactionDetails.transactionHash &&
					blockExplorer && (
						<TouchableOpacity
							onPress={this.viewOnEtherscan} // eslint-disable-line react/jsx-no-bind
						>
							<Text style={styles.viewOnEtherscan}>{strings('transactions.view_on_etherscan')}</Text>
						</TouchableOpacity>
					)}
			</View>
		);
	};
}
