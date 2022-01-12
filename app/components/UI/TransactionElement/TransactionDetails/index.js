import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import {
	getNetworkTypeById,
	findBlockExplorerForRpc,
	getBlockExplorerName,
	isMainNet,
} from '../../../../util/networks';
import { getEtherscanTransactionUrl, getEtherscanBaseUrl } from '../../../../util/etherscan';
import Logger from '../../../../util/Logger';
import { connect } from 'react-redux';
import URL from 'url-parse';
import EthereumAddress from '../../EthereumAddress';
import TransactionSummary from '../../../Views/TransactionSummary';
import { toDateFormat } from '../../../../util/date';
import StyledButton from '../../StyledButton';
import StatusText from '../../../Base/StatusText';
import Text from '../../../Base/Text';
import DetailsModal from '../../../Base/DetailsModal';
import { RPC, NO_RPC_BLOCK_EXPLORER } from '../../../../constants/network';
import { withNavigation } from '@react-navigation/compat';

const styles = StyleSheet.create({
	viewOnEtherscan: {
		fontSize: 16,
		color: colors.blue,
		...fontStyles.normal,
		textAlign: 'center',
	},
	touchableViewOnEtherscan: {
		marginBottom: 24,
		marginTop: 12,
	},
	summaryWrapper: {
		marginVertical: 8,
	},
	actionContainerStyle: {
		height: 25,
		width: 70,
		padding: 0,
	},
	speedupActionContainerStyle: {
		marginRight: 10,
	},
	actionStyle: {
		fontSize: 10,
		padding: 0,
		paddingHorizontal: 10,
	},
	transactionActionsContainer: {
		flexDirection: 'row',
		paddingTop: 10,
	},
});

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
		 * Chain Id
		 */
		chainId: PropTypes.string,
		/**
		 * Object representing the selected the selected network
		 */
		network: PropTypes.object,
		/**
		 * Object corresponding to a transaction, containing transaction object, networkId and transaction hash string
		 */
		transactionObject: PropTypes.object,
		/**
		 * Object with information to render
		 */
		transactionDetails: PropTypes.object,
		/**
		 * Frequent RPC list from PreferencesController
		 */
		frequentRpcList: PropTypes.array,
		/**
		 * Callback to close the view
		 */
		close: PropTypes.func,
		/**
		 * A string representing the network name
		 */
		showSpeedUpModal: PropTypes.func,
		showCancelModal: PropTypes.func,
	};

	state = {
		rpcBlockExplorer: undefined,
		renderTxActions: true,
	};

	componentDidMount = () => {
		const {
			network: {
				provider: { rpcTarget, type },
			},
			frequentRpcList,
		} = this.props;
		let blockExplorer;
		if (type === RPC) {
			blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList) || NO_RPC_BLOCK_EXPLORER;
		}
		this.setState({ rpcBlockExplorer: blockExplorer });
	};

	viewOnEtherscan = () => {
		const {
			navigation,
			transactionObject: { networkID },
			transactionDetails: { transactionHash },
			network: {
				provider: { type },
			},
			close,
		} = this.props;
		const { rpcBlockExplorer } = this.state;
		try {
			if (type === RPC) {
				const url = `${rpcBlockExplorer}/tx/${transactionHash}`;
				const title = new URL(rpcBlockExplorer).hostname;
				navigation.push('Webview', {
					screen: 'SimpleWebview',
					params: { url, title },
				});
			} else {
				const network = getNetworkTypeById(networkID);
				const url = getEtherscanTransactionUrl(network, transactionHash);
				const etherscan_url = getEtherscanBaseUrl(network).replace('https://', '');
				navigation.push('Webview', {
					screen: 'SimpleWebview',
					params: {
						url,
						title: etherscan_url,
					},
				});
			}
			close && close();
		} catch (e) {
			// eslint-disable-next-line no-console
			Logger.error(e, { message: `can't get a block explorer link for network `, networkID });
		}
	};

	renderSpeedUpButton = () => (
		<StyledButton
			type={'normal'}
			containerStyle={[styles.actionContainerStyle, styles.speedupActionContainerStyle]}
			style={styles.actionStyle}
			onPress={this.props.showSpeedUpModal}
		>
			{strings('transaction.speedup')}
		</StyledButton>
	);

	renderCancelButton = () => (
		<StyledButton
			type={'cancel'}
			containerStyle={styles.actionContainerStyle}
			style={styles.actionStyle}
			onPress={this.props.showCancelModal}
		>
			{strings('transaction.cancel')}
		</StyledButton>
	);

	render = () => {
		const {
			chainId,
			transactionDetails,
			transactionObject,
			transactionObject: {
				status,
				time,
				transaction: { nonce },
			},
		} = this.props;
		const renderTxActions = status === 'submitted' || status === 'approved';
		const { rpcBlockExplorer } = this.state;
		return (
			<DetailsModal.Body>
				<DetailsModal.Section borderBottom>
					<DetailsModal.Column>
						<DetailsModal.SectionTitle>{strings('transactions.status')}</DetailsModal.SectionTitle>
						<StatusText status={status} />
						{!!renderTxActions && (
							<View style={styles.transactionActionsContainer}>
								{this.renderSpeedUpButton()}
								{this.renderCancelButton()}
							</View>
						)}
					</DetailsModal.Column>
					<DetailsModal.Column end>
						<DetailsModal.SectionTitle>{strings('transactions.date')}</DetailsModal.SectionTitle>
						<Text small primary>
							{toDateFormat(time)}
						</Text>
					</DetailsModal.Column>
				</DetailsModal.Section>
				<DetailsModal.Section borderBottom={!!nonce}>
					<DetailsModal.Column>
						<DetailsModal.SectionTitle>{strings('transactions.from')}</DetailsModal.SectionTitle>
						<Text small primary>
							<EthereumAddress type="short" address={transactionDetails.renderFrom} />
						</Text>
					</DetailsModal.Column>
					<DetailsModal.Column end>
						<DetailsModal.SectionTitle>{strings('transactions.to')}</DetailsModal.SectionTitle>
						<Text small primary>
							<EthereumAddress type="short" address={transactionDetails.renderTo} />
						</Text>
					</DetailsModal.Column>
				</DetailsModal.Section>
				{!!nonce && (
					<DetailsModal.Section>
						<DetailsModal.Column>
							<DetailsModal.SectionTitle upper>{strings('transactions.nonce')}</DetailsModal.SectionTitle>
							<Text small primary>{`#${parseInt(nonce.replace(/^#/, ''), 16)}`}</Text>
						</DetailsModal.Column>
					</DetailsModal.Section>
				)}
				<View style={[styles.summaryWrapper, !nonce && styles.touchableViewOnEtherscan]}>
					<TransactionSummary
						amount={transactionDetails.summaryAmount}
						fee={transactionDetails.summaryFee}
						totalAmount={transactionDetails.summaryTotalAmount}
						secondaryTotalAmount={
							isMainNet(chainId) ? transactionDetails.summarySecondaryTotalAmount : undefined
						}
						gasEstimationReady
						transactionType={transactionDetails.transactionType}
					/>
				</View>

				{transactionDetails.transactionHash &&
					transactionObject.status !== 'cancelled' &&
					rpcBlockExplorer !== NO_RPC_BLOCK_EXPLORER && (
						<TouchableOpacity onPress={this.viewOnEtherscan} style={styles.touchableViewOnEtherscan}>
							<Text reset style={styles.viewOnEtherscan}>
								{(rpcBlockExplorer &&
									`${strings('transactions.view_on')} ${getBlockExplorerName(rpcBlockExplorer)}`) ||
									strings('transactions.view_on_etherscan')}
							</Text>
						</TouchableOpacity>
					)}
			</DetailsModal.Body>
		);
	};
}

const mapStateToProps = (state) => ({
	network: state.engine.backgroundState.NetworkController,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList,
});
export default connect(mapStateToProps)(withNavigation(TransactionDetails));
