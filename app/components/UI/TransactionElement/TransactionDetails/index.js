import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Clipboard, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import Icon from 'react-native-vector-icons/FontAwesome';
import Button from '../../Button';
import ActionModal from '../../../UI/ActionModal';
import Engine from '../../../../core/Engine';
import { renderFromWei } from '../../../../util/number';
import { CANCEL_RATE } from 'gaba/TransactionController';
import { getNetworkTypeById, findBlockExplorerForRpc, getBlockExplorerName } from '../../../../util/networks';
import { getEtherscanTransactionUrl, getEtherscanBaseUrl } from '../../../../util/etherscan';
import Logger from '../../../../util/Logger';
import { connect } from 'react-redux';
import URL from 'url-parse';

const styles = StyleSheet.create({
	detailRowWrapper: {
		flex: 1,
		backgroundColor: colors.grey000,
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
		shadowColor: colors.grey400,
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
		borderColor: colors.grey100,
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
		color: colors.blue,
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
	},
	cancelButton: {
		backgroundColor: colors.red,
		height: 22,
		paddingHorizontal: 0,
		paddingVertical: 0,
		position: 'absolute',
		right: 15,
		top: 15,
		width: 54,
		zIndex: 1337
	},
	cancelText: {
		color: colors.white,
		fontSize: 10,
		textTransform: 'uppercase'
	},
	modalView: {
		alignItems: 'stretch',
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'space-between',
		padding: 20
	},
	modalText: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center'
	},
	modalTitle: {
		...fontStyles.bold,
		fontSize: 22,
		textAlign: 'center'
	},
	gasTitle: {
		...fontStyles.bold,
		fontSize: 16,
		textAlign: 'center'
	},
	cancelFeeWrapper: {
		backgroundColor: colors.grey000,
		textAlign: 'center',
		padding: 15
	},
	cancelFee: {
		...fontStyles.bold,
		fontSize: 24,
		textAlign: 'center'
	}
});

const NO_RPC_BLOCK_EXPLORER = 'NO_BLOCK_EXPLORER';

/**
 * View that renders a transaction details as part of transactions list
 */
class TransactionDetails extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Object representing the selected the selected network
		 */
		network: PropTypes.object,
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
		 * Object with information to render
		 */
		transactionDetails: PropTypes.object,
		/**
		 * Frequent RPC list from PreferencesController
		 */
		frequentRpcList: PropTypes.array
	};

	state = {
		cancelIsOpen: false,
		rpcBlockExplorer: undefined
	};

	componentDidMount = () => {
		const {
			network: {
				provider: { rpcTarget, type }
			},
			frequentRpcList
		} = this.props;
		let blockExplorer;
		if (type === 'rpc') {
			blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList) || NO_RPC_BLOCK_EXPLORER;
		}
		this.setState({ rpcBlockExplorer: blockExplorer });
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
					{this.renderCopyIcon()}
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

	copyFrom = async () => {
		await Clipboard.setString(this.props.transactionDetails.renderFrom);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('transactions.address_copied_to_clipboard') }
		});
	};

	copyTo = async () => {
		await Clipboard.setString(this.props.transactionDetails.renderTo);
		this.props.showAlert({
			isVisible: true,
			autodismiss: 1500,
			content: 'clipboard-alert',
			data: { msg: strings('transactions.address_copied_to_clipboard') }
		});
	};

	renderCopyIcon = () => (
		<TouchableOpacity style={styles.copyIcon} onPress={this.copy}>
			<Icon name={'copy'} size={15} color={colors.blue} />
		</TouchableOpacity>
	);

	renderCopyToIcon = () => (
		<TouchableOpacity style={styles.copyIcon} onPress={this.copyTo}>
			<Icon name={'copy'} size={15} color={colors.blue} />
		</TouchableOpacity>
	);

	renderCopyFromIcon = () => (
		<TouchableOpacity style={styles.copyIcon} onPress={this.copyFrom}>
			<Icon name={'copy'} size={15} color={colors.blue} />
		</TouchableOpacity>
	);

	viewOnEtherscan = () => {
		const {
			transactionObject: { networkID },
			transactionDetails: { transactionHash },
			network: {
				provider: { type }
			}
		} = this.props;
		const { rpcBlockExplorer } = this.state;
		try {
			if (type === 'rpc') {
				const url = `${rpcBlockExplorer}/tx/${transactionHash}`;
				const title = new URL(rpcBlockExplorer).hostname;
				this.props.navigation.push('Webview', {
					url,
					title
				});
			} else {
				const network = getNetworkTypeById(networkID);
				const url = getEtherscanTransactionUrl(network, transactionHash);
				const etherscan_url = getEtherscanBaseUrl(network).replace('https://', '');
				this.props.navigation.push('Webview', {
					url,
					title: etherscan_url
				});
			}
		} catch (e) {
			// eslint-disable-next-line no-console
			Logger.error(`can't get a block explorer link for network `, networkID, e);
		}
	};

	showCancelModal = () => {
		this.setState({ cancelIsOpen: true });
	};

	hideCancelModal = () => {
		this.setState({ cancelIsOpen: false });
	};

	cancelTransaction = () => {
		Engine.context.TransactionController.stopTransaction(this.props.transactionObject.id);
		this.hideCancelModal();
	};

	renderCancelButton = () => {
		const { transactionObject } = this.props;
		if (transactionObject.status === 'submitted' || transactionObject.status === 'approved') {
			return (
				<Button style={styles.cancelButton} onPress={this.showCancelModal}>
					<Text style={styles.cancelText}>{strings('transaction.cancel')}</Text>
				</Button>
			);
		}
	};

	render = () => {
		const { blockExplorer, transactionObject } = this.props;
		const { rpcBlockExplorer } = this.state;
		const existingGasPrice = transactionObject.transaction ? transactionObject.transaction.gasPrice : '0x0';
		const existingGasPriceDecimal = parseInt(existingGasPrice === undefined ? '0x0' : existingGasPrice, 16);
		return (
			<View style={styles.detailRowWrapper}>
				{this.renderCancelButton()}
				<ActionModal
					modalVisible={this.state.cancelIsOpen}
					confirmText={strings('transaction.lets_try')}
					cancelText={strings('transaction.nevermind')}
					onCancelPress={this.hideCancelModal}
					onRequestClose={this.hideCancelModal}
					onConfirmPress={this.cancelTransaction}
				>
					<View style={styles.modalView}>
						<Text style={styles.modalTitle}>{strings('transaction.cancel_tx_title')}</Text>
						<Text style={styles.gasTitle}>{strings('transaction.gasCancelFee')}</Text>
						<View style={styles.cancelFeeWrapper}>
							<Text style={styles.cancelFee}>
								{renderFromWei(existingGasPriceDecimal * CANCEL_RATE)} {strings('unit.eth')}
							</Text>
						</View>
						<Text style={styles.modalText}>{strings('transaction.cancel_tx_message')}</Text>
					</View>
				</ActionModal>
				{this.renderTxHash(this.props.transactionDetails.transactionHash)}
				<Text style={styles.detailRowTitle}>{strings('transactions.from')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<Text style={styles.detailRowText}>{this.props.transactionDetails.renderFrom}</Text>
					{this.renderCopyFromIcon()}
				</View>
				<Text style={styles.detailRowTitle}>{strings('transactions.to')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<Text style={styles.detailRowText}>{this.props.transactionDetails.renderTo}</Text>
					{this.renderCopyToIcon()}
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
					{this.props.transactionDetails.renderTotalValueFiat ? (
						<View style={[styles.detailRowInfoItem, styles.noBorderBottom]}>
							<Text style={[styles.detailRowText, styles.alignRight]}>
								{this.props.transactionDetails.renderTotalValueFiat}
							</Text>
						</View>
					) : null}
				</View>
				{this.props.transactionDetails.transactionHash &&
					transactionObject.status !== 'cancelled' &&
					blockExplorer &&
					rpcBlockExplorer !== NO_RPC_BLOCK_EXPLORER && (
						<TouchableOpacity
							onPress={this.viewOnEtherscan} // eslint-disable-line react/jsx-no-bind
						>
							<Text style={styles.viewOnEtherscan}>
								{(rpcBlockExplorer &&
									`${strings('transactions.view_on')} ${getBlockExplorerName(
										rpcBlockExplorer
									).toUpperCase()}`) ||
									strings('transactions.view_on_etherscan')}
							</Text>
						</TouchableOpacity>
					)}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	network: state.engine.backgroundState.NetworkController,
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList
});
export default connect(mapStateToProps)(TransactionDetails);
