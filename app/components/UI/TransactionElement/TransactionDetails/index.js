import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Clipboard, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles, baseStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getNetworkTypeById, findBlockExplorerForRpc, getBlockExplorerName } from '../../../../util/networks';
import { getEtherscanTransactionUrl, getEtherscanBaseUrl } from '../../../../util/etherscan';
import Logger from '../../../../util/Logger';
import { connect } from 'react-redux';
import URL from 'url-parse';
import Device from '../../../../util/Device';
import EthereumAddress from '../../EthereumAddress';
import TransactionSummary from '../../../Views/TransactionSummary';

const HASH_LENGTH = Device.isSmallDevice() ? 18 : 20;

const styles = StyleSheet.create({
	detailRowWrapper: {
		flex: 1,
		backgroundColor: colors.white,
		paddingHorizontal: 15,
		marginTop: 10
	},
	detailRowTitle: {
		flex: 1,
		fontSize: 10,
		color: colors.grey500,
		marginBottom: 8,
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
	flexRow: {
		flex: 1,
		flexDirection: 'row'
	},
	section: {
		flex: 1,
		paddingVertical: 16
	},
	sectionBorderBottom: {
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1
	},
	flexEnd: {
		flex: 1,
		alignItems: 'flex-end'
	},
	textUppercase: {
		textTransform: 'uppercase'
	},
	detailRowText: {
		flex: 1,
		fontSize: 12,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	viewOnEtherscan: {
		fontSize: 16,
		color: colors.blue,
		...fontStyles.normal,
		textAlign: 'center'
	},
	touchableViewOnEtherscan: {
		marginVertical: 24
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
	summaryWrapper: {
		marginVertical: 6
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
			Logger.error(e, { message: `can't get a block explorer link for network `, networkID });
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
		console.log('transactionObject', this.props.transactionDetails);
		return (
			<View style={styles.detailRowWrapper}>
				<View style={[styles.section, styles.flexRow, styles.sectionBorderBottom]}>
					<View style={baseStyles.flexGrow}>
						<Text style={styles.detailRowTitle}>{strings('transactions.from')}</Text>
						<EthereumAddress
							type="medium"
							style={styles.detailRowText}
							address={this.props.transactionDetails.renderFrom}
						/>
					</View>
					<View style={styles.flexEnd}>
						<Text style={styles.detailRowTitle}>{strings('transactions.to')}</Text>
						<EthereumAddress
							type="medium"
							style={styles.detailRowText}
							address={this.props.transactionDetails.renderTo}
						/>
					</View>
				</View>
				<View style={styles.section}>
					<Text style={[styles.detailRowTitle, styles.textUppercase]}>{'Nonce'}</Text>
					<Text style={[styles.detailRowText]}>
						{`#${parseInt(transactionObject.transaction.nonce.replace(/^#/, ''), 16)}`}
					</Text>
				</View>
				<View style={styles.summaryWrapper}>
					<TransactionSummary
						transactionValueFiat={this.props.transactionDetails.renderValueFiat}
						transactionFeeFiat={this.props.transactionDetails.renderTotalGasFiat}
						transactionTotalAmountFiat={this.props.transactionDetails.renderTotalValueFiat}
						transactionTotalAmount={this.props.transactionDetails.renderTotalValue}
						gasEstimationReady
					/>
				</View>

				{this.props.transactionDetails.transactionHash &&
					transactionObject.status !== 'cancelled' &&
					blockExplorer &&
					rpcBlockExplorer !== NO_RPC_BLOCK_EXPLORER && (
						<TouchableOpacity onPress={this.viewOnEtherscan} style={styles.touchableViewOnEtherscan}>
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
