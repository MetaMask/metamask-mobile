import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { util } from '@metamask/controllers';
import { connect } from 'react-redux';
import URL from 'url-parse';

import { fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import {
  getNetworkTypeById,
  findBlockExplorerForRpc,
  getBlockExplorerName,
  isMainNet,
  isMultiLayerFeeNetwork,
} from '../../../../util/networks';
import {
  renderFromWei,
  hexToBN,
  calculateEthFeeForMultiLayer,
} from '../../../../util/number';
import {
  getEtherscanTransactionUrl,
  getEtherscanBaseUrl,
} from '../../../../util/etherscan';
import Logger from '../../../../util/Logger';
import EthereumAddress from '../../EthereumAddress';
import TransactionSummary from '../../../Views/TransactionSummary';
import { toDateFormat } from '../../../../util/date';
import StyledButton from '../../StyledButton';
import StatusText from '../../../Base/StatusText';
import Text from '../../../Base/Text';
import DetailsModal from '../../../Base/DetailsModal';
import { RPC, NO_RPC_BLOCK_EXPLORER } from '../../../../constants/network';
import { withNavigation } from '@react-navigation/compat';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import Engine from '../../../../core/Engine';

const createStyles = (colors) =>
  StyleSheet.create({
    viewOnEtherscan: {
      fontSize: 16,
      color: colors.primary.default,
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
    updatedTransactionDetails: undefined,
  };

  fetchTxReceipt = async ({ transactionHash }) => {
    const { TransactionController } = Engine.context;
    return await util.query(
      TransactionController.ethQuery,
      'getTransactionReceipt',
      [transactionHash],
    );
  };

  updateTransactionDetails = async () => {
    const { chainId, transactionDetails } = this.props;
    const multiLayerFeeNetwork = isMultiLayerFeeNetwork(chainId);
    if (!multiLayerFeeNetwork || !transactionDetails?.transactionHash) {
      this.setState({ updatedTransactionDetails: transactionDetails });
      return;
    }
    try {
      const { l1Fee: l1HexGasTotal } = await this.fetchTxReceipt({
        transactionHash: transactionDetails.transactionHash,
      });
      let updatedTotalAmountInEth;
      let updatedFeeInEth;
      const totalAmountSplitted =
        transactionDetails.summaryTotalAmount.split(' ');
      const feeSplitted = transactionDetails.summaryFee.split(' ');
      if (transactionDetails.summaryTotalAmount.includes('<')) {
        updatedTotalAmountInEth = renderFromWei(hexToBN(l1HexGasTotal));
      } else {
        updatedTotalAmountInEth = calculateEthFeeForMultiLayer({
          multiLayerL1FeeTotal: l1HexGasTotal,
          ethFee: totalAmountSplitted[0],
        });
      }
      if (transactionDetails.summaryFee.includes('<')) {
        updatedFeeInEth = renderFromWei(hexToBN(l1HexGasTotal));
      } else {
        updatedFeeInEth = calculateEthFeeForMultiLayer({
          multiLayerL1FeeTotal: l1HexGasTotal,
          ethFee: feeSplitted[0],
        });
      }
      const ticker = totalAmountSplitted[totalAmountSplitted.length - 1];
      const newFee = `${updatedFeeInEth} ${ticker}`;
      const newTotalAmount = `${updatedTotalAmountInEth} ${ticker}`;
      const updatedTransactionDetails = {
        ...transactionDetails,
        summaryFee: newFee,
        summaryTotalAmount: newTotalAmount,
      };
      this.setState({ updatedTransactionDetails });
    } catch (e) {
      Logger.error(e);
      this.setState({ updatedTransactionDetails: transactionDetails });
    }
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
      blockExplorer =
        findBlockExplorerForRpc(rpcTarget, frequentRpcList) ||
        NO_RPC_BLOCK_EXPLORER;
    }
    this.setState({ rpcBlockExplorer: blockExplorer });
    this.updateTransactionDetails();
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
        const etherscan_url = getEtherscanBaseUrl(network).replace(
          'https://',
          '',
        );
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
      Logger.error(e, {
        message: `can't get a block explorer link for network `,
        networkID,
      });
    }
  };

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return createStyles(colors);
  };

  showSpeedUpModal = () => {
    const { showSpeedUpModal, close } = this.props;
    if (close) {
      close();
      showSpeedUpModal();
    }
  };

  showCancelModal = () => {
    const { showCancelModal, close } = this.props;
    if (close) {
      close();
      showCancelModal();
    }
  };

  renderSpeedUpButton = () => {
    const styles = this.getStyles();

    return (
      <StyledButton
        type={'normal'}
        containerStyle={[
          styles.actionContainerStyle,
          styles.speedupActionContainerStyle,
        ]}
        style={styles.actionStyle}
        onPress={this.showSpeedUpModal}
      >
        {strings('transaction.speedup')}
      </StyledButton>
    );
  };

  renderCancelButton = () => {
    const styles = this.getStyles();

    return (
      <StyledButton
        type={'cancel'}
        containerStyle={styles.actionContainerStyle}
        style={styles.actionStyle}
        onPress={this.showCancelModal}
      >
        {strings('transaction.cancel')}
      </StyledButton>
    );
  };

  render = () => {
    const {
      chainId,
      transactionObject: { status, time, transaction },
    } = this.props;
    const { updatedTransactionDetails } = this.state;
    const styles = this.getStyles();

    const renderTxActions = status === 'submitted' || status === 'approved';
    const { rpcBlockExplorer } = this.state;

    return updatedTransactionDetails ? (
      <DetailsModal.Body>
        <DetailsModal.Section borderBottom>
          <DetailsModal.Column>
            <DetailsModal.SectionTitle>
              {strings('transactions.status')}
            </DetailsModal.SectionTitle>
            <StatusText status={status} />
            {!!renderTxActions && (
              <View style={styles.transactionActionsContainer}>
                {this.renderSpeedUpButton()}
                {this.renderCancelButton()}
              </View>
            )}
          </DetailsModal.Column>
          <DetailsModal.Column end>
            <DetailsModal.SectionTitle>
              {strings('transactions.date')}
            </DetailsModal.SectionTitle>
            <Text small primary>
              {toDateFormat(time)}
            </Text>
          </DetailsModal.Column>
        </DetailsModal.Section>
        <DetailsModal.Section borderBottom={!!transaction?.nonce}>
          <DetailsModal.Column>
            <DetailsModal.SectionTitle>
              {strings('transactions.from')}
            </DetailsModal.SectionTitle>
            <Text small primary>
              <EthereumAddress
                type="short"
                address={updatedTransactionDetails.renderFrom}
              />
            </Text>
          </DetailsModal.Column>
          <DetailsModal.Column end>
            <DetailsModal.SectionTitle>
              {strings('transactions.to')}
            </DetailsModal.SectionTitle>
            <Text small primary>
              <EthereumAddress
                type="short"
                address={updatedTransactionDetails.renderTo}
              />
            </Text>
          </DetailsModal.Column>
        </DetailsModal.Section>
        <DetailsModal.Section>
          <DetailsModal.Column>
            <DetailsModal.SectionTitle upper>
              {strings('transactions.nonce')}
            </DetailsModal.SectionTitle>
            {!!transaction?.nonce && (
              <Text small primary>{`#${parseInt(
                transaction.nonce.replace(/^#/, ''),
                16,
              )}`}</Text>
            )}
          </DetailsModal.Column>
        </DetailsModal.Section>
        <View
          style={[
            styles.summaryWrapper,
            !transaction?.nonce && styles.touchableViewOnEtherscan,
          ]}
        >
          <TransactionSummary
            amount={updatedTransactionDetails.summaryAmount}
            fee={updatedTransactionDetails.summaryFee}
            totalAmount={updatedTransactionDetails.summaryTotalAmount}
            secondaryTotalAmount={
              isMainNet(chainId)
                ? updatedTransactionDetails.summarySecondaryTotalAmount
                : undefined
            }
            gasEstimationReady
            transactionType={updatedTransactionDetails.transactionType}
            chainId={chainId}
          />
        </View>

        {updatedTransactionDetails.transactionHash &&
          status !== 'cancelled' &&
          rpcBlockExplorer !== NO_RPC_BLOCK_EXPLORER && (
            <TouchableOpacity
              onPress={this.viewOnEtherscan}
              style={styles.touchableViewOnEtherscan}
            >
              <Text reset style={styles.viewOnEtherscan}>
                {(rpcBlockExplorer &&
                  `${strings('transactions.view_on')} ${getBlockExplorerName(
                    rpcBlockExplorer,
                  )}`) ||
                  strings('transactions.view_on_etherscan')}
              </Text>
            </TouchableOpacity>
          )}
      </DetailsModal.Body>
    ) : null;
  };
}

const mapStateToProps = (state) => ({
  network: state.engine.backgroundState.NetworkController,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  frequentRpcList:
    state.engine.backgroundState.PreferencesController.frequentRpcList,
});

TransactionDetails.contextType = ThemeContext;

export default connect(mapStateToProps)(withNavigation(TransactionDetails));
