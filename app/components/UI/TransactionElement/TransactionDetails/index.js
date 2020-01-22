import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Clipboard, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getNetworkTypeById, findBlockExplorerForRpc, getBlockExplorerName } from '../../../../util/networks';
import { getEtherscanTransactionUrl, getEtherscanBaseUrl } from '../../../../util/etherscan';
import Logger from '../../../../util/Logger';
import { connect } from 'react-redux';
import URL from 'url-parse';
import DeviceSize from '../../../../util/DeviceSize';
import EthereumAddress from '../../EthereumAddress';

const HASH_LENGTH = DeviceSize.isSmallDevice() ? 18 : 20;

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
		marginBottom: 10,
		textTransform: 'uppercase'
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
						HASH_LENGTH
					)} ... ${transactionHash.substr(-HASH_LENGTH)}`}</Text>
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

	render = () => {
		const { blockExplorer, transactionObject } = this.props;
		const { rpcBlockExplorer } = this.state;
		return (
			<View style={styles.detailRowWrapper}>
				{this.renderTxHash(this.props.transactionDetails.transactionHash)}
				<Text style={styles.detailRowTitle}>{strings('transactions.from')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<EthereumAddress style={styles.detailRowText} address={this.props.transactionDetails.renderFrom} />
					{this.renderCopyFromIcon()}
				</View>
				<Text style={styles.detailRowTitle}>{strings('transactions.to')}</Text>
				<View style={[styles.detailRowInfo, styles.singleRow]}>
					<EthereumAddress style={styles.detailRowText} address={this.props.transactionDetails.renderTo} />
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
									`${strings('transactions.view_on')} ${getBlockExplorerName(rpcBlockExplorer)}`) ||
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
