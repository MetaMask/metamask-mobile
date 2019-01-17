import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Clipboard, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { renderFromWei, weiToFiat, hexToBN, isBN, toBN, toGwei, weiToFiatNumber } from '../../../util/number';
import Icon from 'react-native-vector-icons/FontAwesome';
import { renderFullAddress } from '../../../util/address';
import { getNetworkTypeById } from '../../../util/networks';
import { getEtherscanTransactionUrl } from '../../../util/etherscan';
import Logger from '../../../util/Logger';

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
		 * The navigation Object
		 */
		navigation: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
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
		showAlert: PropTypes.func.isRequired
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
		const {
			transactionObject: { transactionHash }
		} = this.props;
		await Clipboard.setString(transactionHash);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 2000,
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
			transactionObject: { transactionHash, networkID }
		} = this.props;
		try {
			const network = getNetworkTypeById(networkID);
			const url = getEtherscanTransactionUrl(network, transactionHash);
			this.props.navigation.push('BrowserView', {
				url
			});
		} catch (e) {
			// eslint-disable-next-line no-console
			Logger.error(`can't get a block explorer link for network `, networkID, e);
		}
	};

	render = () => {
		const {
			transactionObject: {
				transaction: { gas, gasPrice, value, to, from },
				transactionHash,
				transfer
			},
			blockExplorer
		} = this.props;
		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const amount = hexToBN(value);
		const { conversionRate, currentCurrency } = this.props;
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
		const totalEth = isBN(amount) ? amount.add(totalGas) : totalGas;
		const renderAmount = transfer
			? !transfer.amount
				? strings('transaction.value_not_available')
				: transfer.amount
			: renderFromWei(value) + ' ' + strings('unit.eth');
		const renderTotalEth = renderFromWei(totalEth) + ' ' + strings('unit.eth');
		const renderTotal = transfer
			? transfer.amount
				? transfer.amount + ' ' + strings('unit.divisor') + ' ' + renderTotalEth
				: strings('transaction.value_not_available')
			: renderTotalEth;

		const renderTotalEthFiat = weiToFiat(totalEth, conversionRate, currentCurrency).toUpperCase();
		const totalEthFiatAmount = weiToFiatNumber(totalEth, conversionRate);
		const renderTotalFiat = transfer
			? transfer.amountFiat
				? totalEthFiatAmount + transfer.amountFiat + ' ' + currentCurrency.toUpperCase()
				: undefined
			: renderTotalEthFiat;
		const renderTo = transfer ? transfer.to : !to ? strings('transactions.to_contract') : renderFullAddress(to);

		return (
			<View style={styles.detailRowWrapper}>
				{this.renderTxHash(transactionHash)}
				<Text style={styles.detailRowTitle}>{strings('transactions.from')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<Text style={styles.detailRowText}>{renderFullAddress(from)}</Text>
				</View>
				<Text style={styles.detailRowTitle}>{strings('transactions.to')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<Text style={styles.detailRowText}>{renderTo}</Text>
				</View>
				<Text style={styles.detailRowTitle}>{strings('transactions.details')}</Text>
				<View style={styles.detailRowInfo}>
					<View style={styles.detailRowInfoItem}>
						<Text style={[styles.detailRowText, styles.alignLeft]}>{strings('transactions.amount')}</Text>
						<Text style={[styles.detailRowText, styles.alignRight]}>{renderAmount}</Text>
					</View>
					<View style={styles.detailRowInfoItem}>
						<Text style={[styles.detailRowText, styles.alignLeft]}>
							{strings('transactions.gas_limit')}
						</Text>
						<Text style={[styles.detailRowText, styles.alignRight]}>{hexToBN(gas).toNumber()}</Text>
					</View>
					<View style={styles.detailRowInfoItem}>
						<Text style={[styles.detailRowText, styles.alignLeft]}>
							{strings('transactions.gas_price')}
						</Text>
						<Text style={[styles.detailRowText, styles.alignRight]}>{toGwei(gasPrice)}</Text>
					</View>
					<View style={styles.detailRowInfoItem}>
						<Text style={[styles.detailRowText, styles.alignLeft]}>{strings('transactions.total')}</Text>
						<Text style={[styles.detailRowText, styles.alignRight]}>{renderTotal}</Text>
					</View>
					{renderTotalFiat && (
						<View style={[styles.detailRowInfoItem, styles.noBorderBottom]}>
							<Text style={[styles.detailRowText, styles.alignRight]}>{renderTotalFiat}</Text>
						</View>
					)}
				</View>
				{transactionHash &&
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
