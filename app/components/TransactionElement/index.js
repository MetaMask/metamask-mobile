import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, Text, View, Image } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { strings } from '../../../locales/i18n';
import { toLocaleDateTime } from '../../util/date';
import { fromWei, weiToFiat, hexToBN } from '../../util/number';
import { toChecksumAddress } from 'ethereumjs-util';
import Identicon from '../Identicon';
import { connect } from 'react-redux';
import {
	UNKNOWN_FUNCTION_KEY,
	TOKEN_TRANSFER_FUNCTION_SIGNATURE,
	TOKEN_METHOD_TRANSFER,
	TOKEN_METHOD_APPROVE,
	TOKEN_METHOD_TRANSFER_FROM,
	TRANSFER_FROM_ACTION_KEY,
	APPROVE_ACTION_KEY,
	SEND_TOKEN_ACTION_KEY,
	SEND_ETHER_ACTION_KEY,
	DEPLOY_CONTRACT_ACTION_KEY,
	CONTRACT_METHOD_DEPLOY,
	CONTRACT_CREATION_SIGNATURE
} from '../../util/transactions';
import Engine from '../../core/Engine';

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
	}
});

const ethLogo = require('../../images/eth-logo.png'); // eslint-disable-line

/**
 * View that renders a transaction item part of transactions list
 */
class TransactionElement extends Component {
	static propTypes = {
		/**
		 * Callback triggered on press
		 */
		renderTxDetails: PropTypes.func,
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
		selectedTx: PropTypes.string,
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

	componentDidMount = async () => {
		const actionKey = await this.getActionKey(this.props.tx);
		this.setState({ actionKey });
	};

	getActionKey = async tx => {
		const { selectedAddress } = this.props;
		const actionKey = await this.getTransactionActionKey(this.props.tx);
		const incoming = toChecksumAddress(tx.transaction.to) === selectedAddress;
		const selfSent = incoming && toChecksumAddress(tx.transaction.from) === selectedAddress;
		switch (actionKey) {
			case SEND_TOKEN_ACTION_KEY:
				return strings('transactions.sent_tokens');
			case SEND_ETHER_ACTION_KEY:
				return incoming
					? selfSent
						? strings('transactions.self_sent_ether')
						: strings('transactions.received_ether')
					: strings('transactions.sent_ether');
			case DEPLOY_CONTRACT_ACTION_KEY:
				return strings('transactions.contract_deploy');
			default:
				return strings('transactions.smart_contract_interaction');
		}
	};

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

	getMethodData = data => {
		// TODO use eth-method-registry from GABA
		if (data.includes(TOKEN_TRANSFER_FUNCTION_SIGNATURE)) {
			return { name: TOKEN_METHOD_TRANSFER };
		}
		if (data.includes(CONTRACT_CREATION_SIGNATURE)) {
			return { name: CONTRACT_METHOD_DEPLOY };
		}
		return {};
	};

	isSmartContractAddress = async address => {
		const { TransactionController } = Engine.context;
		const code = address ? await TransactionController.query('getCode', [address]) : undefined;
		// Geth will return '0x', and ganache-core v2.2.1 will return '0x0'
		const codeIsEmpty = !code || code === '0x' || code === '0x0';
		return !codeIsEmpty;
	};

	getTransactionActionKey = async transaction => {
		const { transaction: { data, to } = {} } = transaction;
		if (data) {
			const methodData = this.getMethodData(data);
			const toSmartContract = await this.isSmartContractAddress(to);
			const { name } = methodData;
			const methodName = name && name.toLowerCase();

			if (!toSmartContract) {
				if (methodName === CONTRACT_METHOD_DEPLOY) {
					return DEPLOY_CONTRACT_ACTION_KEY;
				}
				return SEND_ETHER_ACTION_KEY;
			}

			if (!methodName) {
				return UNKNOWN_FUNCTION_KEY;
			}

			switch (methodName) {
				case TOKEN_METHOD_TRANSFER:
					return SEND_TOKEN_ACTION_KEY;
				case TOKEN_METHOD_APPROVE:
					return APPROVE_ACTION_KEY;
				case TOKEN_METHOD_TRANSFER_FROM:
					return TRANSFER_FROM_ACTION_KEY;
				default:
					return UNKNOWN_FUNCTION_KEY;
			}
		}
		return SEND_ETHER_ACTION_KEY;
	};

	render = () => {
		const {
			tx,
			renderTxDetails,
			selectedTx,
			selectedAddress,
			i,
			conversionRate,
			currentCurrency,
			toggleDetailsView
		} = this.props;
		const incoming = toChecksumAddress(tx.transaction.to) === selectedAddress;
		const selfSent = incoming && toChecksumAddress(tx.transaction.from) === selectedAddress;
		const { actionKey } = this.state;
		return (
			<TouchableOpacity
				style={styles.row}
				key={`tx-${tx.id}`}
				onPress={() => toggleDetailsView(tx.transactionHash, i)} // eslint-disable-line react/jsx-no-bind
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
				{tx.transactionHash === selectedTx ? renderTxDetails(tx) : null}
			</TouchableOpacity>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(TransactionElement);
