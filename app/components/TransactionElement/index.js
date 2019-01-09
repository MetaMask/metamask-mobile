import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Clipboard, TouchableOpacity, StyleSheet, Text, View, Image } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { toLocaleDateTime } from '../../util/date';
import { fromWei, weiToFiat, hexToBN, isBN, toBN, toGwei } from '../../util/number';
import { toChecksumAddress } from 'ethereumjs-util';
import Identicon from '../Identicon';
import { connect } from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getActionKey } from '../../util/transactions';
import { renderFullAddress } from '../../util/address';
import { getNetworkTypeById } from '../../util/networks';
import { getEtherscanTransactionUrl } from '../../util/etherscan';

const styles = StyleSheet.create({
	row: {
		backgroundColor: colors.white,
		flex: 1,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor
	},
	rowContent: {
		padding: 15
	},
	date: {
		color: colors.fontSecondary,
		fontSize: 12,
		marginBottom: 10,
		...fontStyles.normal
	},
	info: {
		marginLeft: 15
	},
	address: {
		fontSize: 15,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	status: {
		marginTop: 5,
		paddingVertical: 3,
		paddingHorizontal: 5,
		textAlign: 'center',
		backgroundColor: colors.concrete,
		color: colors.gray,
		fontSize: 9,
		letterSpacing: 0.5,
		width: 75,
		...fontStyles.bold
	},
	amount: {
		fontSize: 15,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	amountFiat: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	amounts: {
		flex: 1,
		alignItems: 'flex-end'
	},
	subRow: {
		flexDirection: 'row'
	},
	statusConfirmed: {
		backgroundColor: colors.lightSuccess,
		color: colors.success
	},
	statusSubmitted: {
		backgroundColor: colors.lightWarning,
		color: colors.warning
	},
	statusFailed: {
		backgroundColor: colors.lightRed,
		color: colors.error
	},
	ethLogo: {
		width: 24,
		height: 24
	},

	detailRowWrapper: {
		flex: 1,
		backgroundColor: colors.concrete,
		paddingVertical: 10,
		paddingHorizontal: 15
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
		textAlign: 'left'
	},
	alignRight: {
		textAlign: 'right'
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

const ethLogo = require('../../images/eth-logo.png'); // eslint-disable-line

/**
 * View that renders a transaction item part of transactions list
 */
class TransactionElement extends PureComponent {
	static propTypes = {
		/**
		 * The navigation Object
		 */
		navigation: PropTypes.object,
		/**
		 * Asset object (in this case ERC721 token)
		 */
		tx: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Callback function that will adjust the scroll
		 * position once the transaction detail is visible
		 */
		selected: PropTypes.bool,
		/**
		 * String of selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Current element of the list index
		 */
		i: PropTypes.number,
		/**
		 * Callback to render transaction details view
		 */
		toggleDetailsView: PropTypes.func
	};

	state = {
		actionKey: undefined
	};

	mounted = false;

	componentDidMount = async () => {
		this.mounted = true;
		const { tx, selectedAddress } = this.props;
		const actionKey = await getActionKey(tx, selectedAddress);
		this.mounted && this.setState({ actionKey });
	};

	componentWillUnmount() {
		this.mounted = false;
	}

	getStatusStyle(status) {
		if (status === 'confirmed') {
			return styles.statusConfirmed;
		} else if (status === 'submitted' || status === 'approved') {
			return styles.statusSubmitted;
		} else if (status === 'failed') {
			return styles.statusFailed;
		}
		return null;
	}

	toggleDetailsView = () => {
		const { tx, i, toggleDetailsView } = this.props;
		toggleDetailsView(tx.transactionHash, i);
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

	renderCopyIcon = str => {
		function copy() {
			Clipboard.setString(str);
		}
		return (
			<TouchableOpacity style={styles.copyIcon} onPress={copy}>
				<Icon name={'copy'} size={15} color={colors.primary} />
			</TouchableOpacity>
		);
	};

	viewOnEtherscan = () => {
		const { transactionHash, networkID } = this.props.tx;
		try {
			const network = getNetworkTypeById(networkID);
			const url = getEtherscanTransactionUrl(network, transactionHash);
			this.props.navigation.push('BrowserView', {
				url
			});
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error(`can't get a block explorer link for network `, networkID, e);
		}
	};

	renderTxDetails = tx => {
		const {
			transaction: { gas, gasPrice, value, to, from },
			transactionHash
		} = tx;
		const gasBN = hexToBN(gas);
		const gasPriceBN = hexToBN(gasPrice);
		const amount = hexToBN(value);
		const { conversionRate, currentCurrency } = this.props;
		const totalGas = isBN(gasBN) && isBN(gasPriceBN) ? gasBN.mul(gasPriceBN) : toBN('0x0');
		const total = isBN(amount) ? amount.add(totalGas) : totalGas;

		return (
			<View style={styles.detailRowWrapper}>
				{this.renderTxHash(transactionHash)}
				<Text style={styles.detailRowTitle}>{strings('transactions.from')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<Text style={styles.detailRowText}>{renderFullAddress(from)}</Text>
				</View>
				<Text style={styles.detailRowTitle}>{strings('transactions.to')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<Text style={styles.detailRowText}>{renderFullAddress(to)}</Text>
				</View>
				<Text style={styles.detailRowTitle}>{strings('transactions.details')}</Text>
				<View style={styles.detailRowInfo}>
					<View style={styles.detailRowInfoItem}>
						<Text style={[styles.detailRowText, styles.alignLeft]}>{strings('transactions.amount')}</Text>
						<Text style={[styles.detailRowText, styles.alignRight]}>
							{fromWei(value, 'ether')} {strings('unit.eth')}
						</Text>
					</View>
					<View style={styles.detailRowInfoItem}>
						<Text style={[styles.detailRowText, styles.alignLeft]} />
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
						<Text style={[styles.detailRowText, styles.alignRight]}>
							{fromWei(total, 'ether')} {strings('unit.eth')}
						</Text>
					</View>
					<View style={[styles.detailRowInfoItem, styles.noBorderBottom]}>
						<Text style={[styles.detailRowText, styles.alignRight]}>
							{weiToFiat(total, conversionRate, currentCurrency).toUpperCase()}
						</Text>
					</View>
				</View>
				{tx.transactionHash && (
					<TouchableOpacity
						onPress={this.viewOnEtherscan} // eslint-disable-line react/jsx-no-bind
					>
						<Text style={styles.viewOnEtherscan}>{strings('transactions.view_on_etherscan')}</Text>
					</TouchableOpacity>
				)}
			</View>
		);
	};

	render = () => {
		const { tx, selected, selectedAddress, conversionRate, currentCurrency } = this.props;
		const incoming = toChecksumAddress(tx.transaction.to) === selectedAddress;
		const selfSent = incoming && toChecksumAddress(tx.transaction.from) === selectedAddress;
		const { actionKey } = this.state;

		return (
			<TouchableOpacity
				style={styles.row}
				key={`tx-${tx.id}`}
				onPress={this.toggleDetailsView} // eslint-disable-line react/jsx-no-bind
			>
				<View style={styles.rowContent}>
					<Text style={styles.date}>
						{(!incoming || selfSent) && `#${hexToBN(tx.transaction.nonce).toString()}  - `}
						{`${toLocaleDateTime(tx.time)}`}
					</Text>
					<View style={styles.subRow}>
						{actionKey !== strings('transactions.contract_deploy') ? (
							<Identicon address={tx.transaction.to} diameter={24} />
						) : (
							<Image source={ethLogo} style={styles.ethLogo} />
						)}
						<View style={styles.info}>
							<Text style={styles.address}>{actionKey}</Text>
							<Text style={[styles.status, this.getStatusStyle(tx.status)]}>
								{tx.status.toUpperCase()}
							</Text>
						</View>
						<View style={styles.amounts}>
							<Text style={styles.amount}>
								- {fromWei(tx.transaction.value, 'ether')} {strings('unit.eth')}
							</Text>
							<Text style={styles.amountFiat}>
								-{' '}
								{weiToFiat(
									hexToBN(tx.transaction.value),
									conversionRate,
									currentCurrency
								).toUpperCase()}
							</Text>
						</View>
					</View>
				</View>
				{selected ? this.renderTxDetails(tx) : null}
			</TouchableOpacity>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(TransactionElement);
