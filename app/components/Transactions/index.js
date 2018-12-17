import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Clipboard } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { colors, fontStyles } from '../../styles/common';
import Identicon from '../Identicon';
import { fromWei, toGwei, weiToFiat, hexToBN, isBN, toBN } from '../../util/number';
import { renderFullAddress } from '../../util/address';
import { toLocaleDateTime } from '../../util/date';
import { strings } from '../../../locales/i18n';
import { toChecksumAddress } from 'ethereumjs-util';
import { getEtherscanTransactionUrl } from '../../util/etherscan';
import { getNetworkTypeById } from '../../util/networks';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	emptyView: {
		paddingTop: 80,
		alignItems: 'center',
		backgroundColor: colors.white,
		flex: 1
	},
	text: {
		fontSize: 20,
		color: colors.fontTertiary,
		...fontStyles.normal
	},
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

/**
 * View that renders a list of transactions for a specific asset
 */
export default class Transactions extends Component {
	static propTypes = {
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * An array of transactions objects
		 */
		transactions: PropTypes.array,
		/**
		 * Callback function that will adjust the scroll
		 * position once the transaction detail is visible
		 */
		adjustScroll: PropTypes.func,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * A string that represents the selected network id
		 */
		networkId: PropTypes.number
	};

	state = {
		selectedTx: null
	};

	viewOnEtherscan = (hash, networkID) => {
		try {
			const network = getNetworkTypeById(networkID);
			const url = getEtherscanTransactionUrl(network, hash);
			this.props.navigation.navigate('BrowserView', {
				url
			});
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error(`can't get a block explorer link for network `, networkID);
		}
	};

	toggleDetailsView(hash, index) {
		const show = this.state.selectedTx !== hash;
		this.setState({ selectedTx: show ? hash : null });
		if (show) {
			this.props.adjustScroll && this.props.adjustScroll(index);
		}
	}

	renderCopyIcon(str) {
		function copy() {
			Clipboard.setString(str);
		}
		return (
			<TouchableOpacity style={styles.copyIcon} onPress={copy}>
				<Icon name={'copy'} size={15} color={colors.primary} />
			</TouchableOpacity>
		);
	}

	renderTxHash(transactionHash) {
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
	}

	renderTxDetails(tx) {
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
						onPress={() => this.viewOnEtherscan(tx.transactionHash, tx.networkID)} // eslint-disable-line react/jsx-no-bind
					>
						<Text style={styles.viewOnEtherscan}>{strings('transactions.view_on_etherscan')}</Text>
					</TouchableOpacity>
				)}
			</View>
		);
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

	renderEmpty = () => (
		<View style={styles.emptyView}>
			<Text style={styles.text}>{strings('wallet.no_transactions')}</Text>
		</View>
	);

	render = () => {
		const { transactions, currentCurrency, conversionRate, selectedAddress, networkId } = this.props;
		const txs = transactions.filter(
			tx =>
				((tx.transaction.from && toChecksumAddress(tx.transaction.from) === selectedAddress) ||
					(tx.transaction.to && toChecksumAddress(tx.transaction.to) === selectedAddress)) &&
				networkId.toString() === tx.networkID
		);
		if (!txs.length) {
			return this.renderEmpty();
		}
		txs.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));

		return (
			<ScrollView style={styles.wrapper}>
				<View testID={'transactions'}>
					{txs.map((tx, i) => {
						const incoming = toChecksumAddress(tx.transaction.to) === selectedAddress;
						const selfSent = incoming && toChecksumAddress(tx.transaction.from) === selectedAddress;
						return (
							<TouchableOpacity
								style={styles.row}
								key={`tx-${tx.id}`}
								onPress={() => this.toggleDetailsView(tx.transactionHash, i)} // eslint-disable-line react/jsx-no-bind
							>
								<View style={styles.rowContent}>
									<Text style={styles.date}>
										{(!incoming || selfSent) && `#${hexToBN(tx.transaction.nonce).toString()}  - `}
										{`${toLocaleDateTime(tx.time)}`}
									</Text>
									<View style={styles.subRow}>
										<Identicon address={tx.transaction.to} diameter={24} />
										<View style={styles.info}>
											<Text style={styles.address}>
												{incoming
													? selfSent
														? strings('transactions.self_sent_ether')
														: strings('transactions.received_ether')
													: strings('transactions.sent_ether')}
											</Text>
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
								{tx.transactionHash === this.state.selectedTx ? this.renderTxDetails(tx) : null}
							</TouchableOpacity>
						);
					})}
				</View>
			</ScrollView>
		);
	};
}
