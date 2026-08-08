import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { query } from '@metamask/controller-utils';
import { connect } from 'react-redux';

import { fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import {
  getBlockExplorerName,
  findBlockExplorerUrlForChain,
  isMainNet,
  isMultiLayerFeeNetwork,
  getBlockExplorerTxUrl,
} from '../../../../util/networks';
import Logger from '../../../../util/Logger';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { trackBlockExplorerLinkClicked } from '../../../../util/analytics/externalLinkTracking';
import EthereumAddress from '../../EthereumAddress';
import TransactionSummary from '../../../Views/TransactionSummary';
import { toDateFormat } from '../../../../util/date';
import StyledButton from '../../StyledButton';
import StatusText from '../../../Base/StatusText';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import DetailsModal from '../../../Base/DetailsModal';
import { RPC, NO_RPC_BLOCK_EXPLORER } from '../../../../constants/network';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import decodeTransaction from '../../TransactionElement/utils';
import {
  selectNetworkConfigurations,
  selectTickerByChainId,
} from '../../../../selectors/networkController';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectTokensByChainIdAndAddress } from '../../../../selectors/tokensController';
import { selectContractExchangeRatesByChainId } from '../../../../selectors/tokenRatesController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { regex } from '../../../../../app/util/regex';
import {
  selectPrimaryCurrency,
  selectAvatarAccountType,
} from '../../../../selectors/settings';
import {
  selectSwapsTransactions,
  selectTransactions,
} from '../../../../selectors/transactionController';
import { getGlobalEthQuery } from '../../../../util/networks/global-network';
import {
  hasGasFeeTokenSelected,
  isTransactionMarkedAsGasFeeSponsored,
} from '../../../Views/confirmations/utils/transaction';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import { TransactionType } from '@metamask/transaction-controller';
import TagBase from '../../../../component-library/base-components/TagBase';
import { isHardwareAccount } from '../../../../util/address';

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
    cellAccount: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
    accountNameLabel: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountNameAvatar: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    accountAvatar: {
      marginRight: 8,
    },
  });

/**
 * Returns the appropriate block explorer URL for a given chain
 * @param {string} txChainId - The transaction chain ID
 * @param {Object} networkConfigurations - The network configurations object
 * @returns {string} The block explorer URL
 */
const getBlockExplorerForChain = (txChainId, networkConfigurations) =>
  findBlockExplorerUrlForChain(txChainId, networkConfigurations) ??
  NO_RPC_BLOCK_EXPLORER;

const fetchTxReceipt = async (transactionHash) => {
  const ethQuery = getGlobalEthQuery();
  return await query(ethQuery, 'getTransactionReceipt', [transactionHash]);
};

/**
 * View that renders a transaction details as part of transactions list
 */
const TransactionDetails = ({
  navigation,
  transactionObject,
  transactionDetails,
  networkConfigurations,
  close,
  showSpeedUpModal,
  showCancelModal,
  selectedAddress,
  transactions,
  ticker,
  tokens,
  contractExchangeRates,
  conversionRate,
  currentCurrency,
  swapsTransactions,
  primaryCurrency,
  avatarAccountType,
}) => {
  const theme = useContext(ThemeContext);
  const styles = useMemo(
    () => createStyles(theme.colors || mockTheme.colors),
    [theme.colors],
  );
  const [rpcBlockExplorer, setRpcBlockExplorer] = useState();
  const [updatedTransactionDetails, setUpdatedTransactionDetails] = useState();

  useEffect(() => {
    let active = true;
    const txChainId = transactionObject.chainId;
    const blockExplorer = getBlockExplorerForChain(
      txChainId,
      networkConfigurations,
    );
    setRpcBlockExplorer(blockExplorer);

    const updateTransactionDetails = async () => {
      const chainId = transactionObject.chainId;
      const multiLayerFeeNetwork = isMultiLayerFeeNetwork(chainId);
      const transactionHash = transactionDetails?.hash;
      if (
        !multiLayerFeeNetwork ||
        !transactionHash ||
        !transactionObject.txParams
      ) {
        if (active) {
          setUpdatedTransactionDetails(transactionDetails);
        }
        return;
      }
      try {
        let { l1Fee: multiLayerL1FeeTotal } =
          await fetchTxReceipt(transactionHash);
        if (!multiLayerL1FeeTotal) {
          multiLayerL1FeeTotal = '0x0'; // Sets it to 0 if it's not available in a txReceipt yet.
        }
        const transactionObjectWithFee = {
          ...transactionObject,
          txParams: {
            ...transactionObject.txParams,
            multiLayerL1FeeTotal,
          },
        };
        const decodedTx = await decodeTransaction({
          tx: transactionObjectWithFee,
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
          txChainId: transactionObject.chainId,
        });
        if (active) {
          setUpdatedTransactionDetails(decodedTx[1]);
        }
      } catch (e) {
        Logger.error(e);
        if (active) {
          setUpdatedTransactionDetails(transactionDetails);
        }
      }
    };

    updateTransactionDetails();

    return () => {
      active = false;
    };
  }, [
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    networkConfigurations,
    primaryCurrency,
    selectedAddress,
    swapsTransactions,
    ticker,
    tokens,
    transactionDetails,
    transactionObject,
    transactions,
  ]);

  const viewOnEtherscan = useCallback(() => {
    const { networkID } = transactionObject;
    const { hash } = transactionDetails;
    try {
      const { url, title } = getBlockExplorerTxUrl(RPC, hash, rpcBlockExplorer);
      trackBlockExplorerLinkClicked(
        analytics.trackEvent,
        AnalyticsEventBuilder.createEventBuilder,
        {
          location: 'transaction_details',
          text: `${strings('transactions.view_on')} ${getBlockExplorerName(
            rpcBlockExplorer,
          )}`,
          url,
        },
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
  }, [
    close,
    navigation,
    rpcBlockExplorer,
    transactionDetails,
    transactionObject,
  ]);

  const renderSpeedUpButton = () => (
    <StyledButton
      type={'normal'}
      containerStyle={[
        styles.actionContainerStyle,
        styles.speedupActionContainerStyle,
      ]}
      style={styles.actionStyle}
      onPress={showSpeedUpModal}
    >
      {strings('transaction.speedup')}
    </StyledButton>
  );

  const renderCancelButton = () => (
    <StyledButton
      type={'cancel'}
      containerStyle={styles.actionContainerStyle}
      style={styles.actionStyle}
      onPress={showCancelModal}
    >
      {strings('transaction.cancel')}
    </StyledButton>
  );

  const {
    status,
    time,
    txParams,
    chainId: txChainId,
    isSmartTransaction,
  } = transactionObject;
  const chainId = txChainId;
  const hasNestedTransactions = Boolean(
    transactionObject?.nestedTransactions?.length,
  );
  const fromAddress = txParams?.from;
  const isHardwareWallet = Boolean(
    fromAddress && isHardwareAccount(fromAddress),
  );
  const isBridgeTransaction =
    transactionObject?.type === TransactionType.bridge;
  const renderTxActions =
    (status === 'submitted' || status === 'approved') &&
    !isSmartTransaction &&
    !isBridgeTransaction &&
    !hasGasFeeTokenSelected(transactionObject);

  return updatedTransactionDetails ? (
    <DetailsModal.Body>
      {hasNestedTransactions && (
        <DetailsModal.Section>
          <DetailsModal.Column>
            <TagBase includesBorder>
              <Text
                color={TextColor.Alternative}
                variant={TextVariant.BodySMBold}
              >
                {strings('transactions.batched_transactions')}
              </Text>
            </TagBase>
          </DetailsModal.Column>
        </DetailsModal.Section>
      )}
      <DetailsModal.Section borderBottom>
        <DetailsModal.Column>
          <DetailsModal.SectionTitle>
            {strings('transactions.status')}
          </DetailsModal.SectionTitle>
          <StatusText status={status} />
          {!!renderTxActions &&
            updatedTransactionDetails?.txChainId === chainId && (
              <View style={styles.transactionActionsContainer}>
                {renderSpeedUpButton()}
                {renderCancelButton()}
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
      <DetailsModal.Section borderBottom={!!txParams?.nonce}>
        <DetailsModal.Column>
          <DetailsModal.SectionTitle>
            {strings('transactions.from')}
          </DetailsModal.SectionTitle>
          <View style={styles.cellAccount}>
            <View style={styles.accountNameLabel}>
              <View style={styles.accountNameAvatar}>
                <Avatar
                  variant={AvatarVariant.Account}
                  type={avatarAccountType || AvatarAccountType.Maskicon}
                  accountAddress={updatedTransactionDetails.renderFrom}
                  size={AvatarSize.Sm}
                  style={styles.accountAvatar}
                />
                <Text
                  variant={TextVariant.BodySM}
                  primary
                  testID={WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT}
                >
                  <EthereumAddress
                    type="short"
                    address={updatedTransactionDetails.renderFrom}
                  />
                </Text>
              </View>
            </View>
          </View>
        </DetailsModal.Column>
        <DetailsModal.Column end>
          <DetailsModal.SectionTitle>
            {strings('transactions.to')}
          </DetailsModal.SectionTitle>
          <View style={styles.cellAccount}>
            <View style={styles.accountNameLabel}>
              <View style={styles.accountNameAvatar}>
                <Avatar
                  variant={AvatarVariant.Account}
                  type={avatarAccountType || AvatarAccountType.Maskicon}
                  accountAddress={updatedTransactionDetails.renderTo}
                  size={AvatarSize.Sm}
                  style={styles.accountAvatar}
                />
                <Text
                  variant={TextVariant.BodySM}
                  primary
                  testID={WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT}
                >
                  <EthereumAddress
                    type="short"
                    address={updatedTransactionDetails.renderTo}
                  />
                </Text>
              </View>
            </View>
          </View>
        </DetailsModal.Column>
      </DetailsModal.Section>
      {!!txParams?.nonce && (
        <DetailsModal.Section>
          <DetailsModal.Column>
            <DetailsModal.SectionTitle upper>
              {strings('transactions.nonce')}
            </DetailsModal.SectionTitle>
            <Text small primary>{`#${parseInt(
              txParams.nonce.replace(regex.transactionNonce, ''),
              16,
            )}`}</Text>
          </DetailsModal.Column>
        </DetailsModal.Section>
      )}
      <View
        style={[
          styles.summaryWrapper,
          !txParams?.nonce && styles.touchableViewOnEtherscan,
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
          isGasFeeSponsored={
            isTransactionMarkedAsGasFeeSponsored(transactionObject) &&
            !isHardwareWallet
          }
        />
      </View>
      {updatedTransactionDetails.hash &&
        status !== 'cancelled' &&
        rpcBlockExplorer &&
        rpcBlockExplorer !== NO_RPC_BLOCK_EXPLORER && (
          <TouchableOpacity
            onPress={viewOnEtherscan}
            style={styles.touchableViewOnEtherscan}
          >
            <Text style={styles.viewOnEtherscan}>
              {`${strings('transactions.view_on')} ${getBlockExplorerName(
                rpcBlockExplorer,
              )}`}
            </Text>
          </TouchableOpacity>
        )}
    </DetailsModal.Body>
  ) : null;
};

TransactionDetails.propTypes = {
  /**
  /* navigation object required to push new views
  */
  navigation: PropTypes.object,
  /**
   * Object corresponding to a transaction, containing transaction object, networkId and transaction hash string
   */
  transactionObject: PropTypes.object,
  /**
   * Object with information to render
   */
  transactionDetails: PropTypes.object,
  /**
   * Network configurations
   */
  networkConfigurations: PropTypes.object,
  /**
   * Callback to close the view
   */
  close: PropTypes.func,
  /**
   * A string representing the network name
   */
  showSpeedUpModal: PropTypes.func,
  showCancelModal: PropTypes.func,
  selectedAddress: PropTypes.string,
  transactions: PropTypes.array,
  ticker: PropTypes.string,
  tokens: PropTypes.object,
  contractExchangeRates: PropTypes.object,
  conversionRate: PropTypes.number,
  currentCurrency: PropTypes.string,
  swapsTransactions: PropTypes.object,
  primaryCurrency: PropTypes.string,

  /**
   * Avatar style to render for account icons
   */
  avatarAccountType: PropTypes.string,
};

const MemoizedTransactionDetails = React.memo(TransactionDetails);
MemoizedTransactionDetails.displayName = 'TransactionDetails';

const mapStateToProps = (state, ownProps) => ({
  networkConfigurations: selectNetworkConfigurations(state),
  selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
  transactions: selectTransactions(state),
  ticker: selectTickerByChainId(state, ownProps.transactionObject.chainId),
  tokens: selectTokensByChainIdAndAddress(
    state,
    ownProps.transactionObject.chainId,
  ),
  contractExchangeRates: selectContractExchangeRatesByChainId(
    state,
    ownProps.transactionObject.chainId,
  ),
  conversionRate: selectConversionRateByChainId(
    state,
    ownProps.transactionObject.chainId,
  ),
  currentCurrency: selectCurrentCurrency(state),
  primaryCurrency: selectPrimaryCurrency(state),
  swapsTransactions: selectSwapsTransactions(state),
  avatarAccountType: selectAvatarAccountType(state),
});

const ConnectedTransactionDetails = connect(mapStateToProps)(
  MemoizedTransactionDetails,
);

const TransactionDetailsWrapper = (props) => {
  const navigation = useNavigation();
  return <ConnectedTransactionDetails {...props} navigation={navigation} />;
};

export default TransactionDetailsWrapper;
