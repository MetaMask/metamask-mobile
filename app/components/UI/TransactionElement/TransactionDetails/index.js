import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { query } from '@metamask/controller-utils';
import { connect } from 'react-redux';

import { fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import {
  findBlockExplorerForRpc,
  getBlockExplorerName,
  isMainNet,
  isMultiLayerFeeNetwork,
  getBlockExplorerTxUrl,
} from '../../../../util/networks';
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
import decodeTransaction from '../../TransactionElement/utils';
import {
  selectChainId,
  selectProviderConfig,
  selectTicker,
} from '../../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectTokensByAddress } from '../../../../selectors/tokensController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import {
  selectFrequentRpcList,
  selectSelectedAddress,
} from '../../../../selectors/preferencesController';

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
     * Object representing the configuration of the current selected network
     */
    providerConfig: PropTypes.object,
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
    transaction: PropTypes.object,
    selectedAddress: PropTypes.string,
    transactions: PropTypes.array,
    ticker: PropTypes.string,
    tokens: PropTypes.object,
    contractExchangeRates: PropTypes.object,
    conversionRate: PropTypes.number,
    currentCurrency: PropTypes.string,
    swapsTransactions: PropTypes.object,
    swapsTokens: PropTypes.array,
    primaryCurrency: PropTypes.string,
  };

  state = {
    rpcBlockExplorer: undefined,
    renderTxActions: true,
    updatedTransactionDetails: undefined,
  };

  fetchTxReceipt = async (transactionHash) => {
    const { TransactionController } = Engine.context;
    return await query(
      TransactionController.ethQuery,
      'getTransactionReceipt',
      [transactionHash],
    );
  };

  /**
   * Updates transactionDetails for multilayer fee networks (e.g. for Optimism).
   */
  updateTransactionDetails = async () => {
    const {
      transactionObject,
      transactionDetails,
      selectedAddress,
      ticker,
      chainId,
      conversionRate,
      currentCurrency,
      contractExchangeRates,
      tokens,
      primaryCurrency,
      swapsTransactions,
      swapsTokens,
      transactions,
    } = this.props;
    const multiLayerFeeNetwork = isMultiLayerFeeNetwork(chainId);
    const transactionHash = transactionDetails?.transactionHash;
    if (
      !multiLayerFeeNetwork ||
      !transactionHash ||
      !transactionObject.transaction
    ) {
      this.setState({ updatedTransactionDetails: transactionDetails });
      return;
    }
    try {
      let { l1Fee: multiLayerL1FeeTotal } = await this.fetchTxReceipt(
        transactionHash,
      );
      if (!multiLayerL1FeeTotal) {
        multiLayerL1FeeTotal = '0x0'; // Sets it to 0 if it's not available in a txReceipt yet.
      }
      transactionObject.transaction.multiLayerL1FeeTotal = multiLayerL1FeeTotal;
      const decodedTx = await decodeTransaction({
        tx: transactionObject,
        selectedAddress,
        ticker,
        chainId,
        conversionRate,
        currentCurrency,
        transactions,
        contractExchangeRates,
        tokens,
        primaryCurrency,
        swapsTransactions,
        swapsTokens,
      });
      this.setState({ updatedTransactionDetails: decodedTx[1] });
    } catch (e) {
      Logger.error(e);
      this.setState({ updatedTransactionDetails: transactionDetails });
    }
  };

  componentDidMount = () => {
    const {
      providerConfig: { rpcTarget, type },
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
      providerConfig: { type },
      close,
    } = this.props;
    const { rpcBlockExplorer } = this.state;
    try {
      const { url, title } = getBlockExplorerTxUrl(
        type,
        transactionHash,
        rpcBlockExplorer,
      );
      navigation.push('Webview', {
        screen: 'SimpleWebview',
        params: { url, title },
      });
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
  providerConfig: selectProviderConfig(state),
  chainId: selectChainId(state),
  frequentRpcList: selectFrequentRpcList(state),
  selectedAddress: selectSelectedAddress(state),
  transactions: state.engine.backgroundState.TransactionController.transactions,
  ticker: selectTicker(state),
  tokens: selectTokensByAddress(state),
  contractExchangeRates: selectContractExchangeRates(state),
  conversionRate: selectConversionRate(state),
  currentCurrency: selectCurrentCurrency(state),
  primaryCurrency: state.settings.primaryCurrency,
  swapsTransactions:
    state.engine.backgroundState.TransactionController.swapsTransactions || {},
  swapsTokens: state.engine.backgroundState.SwapsController.tokens,
});

TransactionDetails.contextType = ThemeContext;

export default connect(mapStateToProps)(withNavigation(TransactionDetails));
