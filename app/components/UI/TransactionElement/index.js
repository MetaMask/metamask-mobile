import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import { connect, useSelector } from 'react-redux';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { safeToChecksumAddress } from '../../../util/address';
import { toDateFormat } from '../../../util/date';
import { getDecimalChainId } from '../../../util/networks';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { selectTickerByChainId } from '../../../selectors/networkController';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountAddress,
} from '../../../selectors/accountsController';
import { selectSelectedAccountGroupInternalAccounts } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectPrimaryCurrency } from '../../../selectors/settings';
import {
  selectSwapsTransactions,
  selectTransactions,
} from '../../../selectors/transactionController';
import { useBridgeTxHistoryData } from '../../../util/bridge/hooks/useBridgeTxHistoryData';
import { handleUnifiedSwapsTxHistoryItemClick } from '../Bridge/utils/transaction-history';
import {
  selectConversionRateByChainId,
  selectCurrencyRates,
} from '../../../selectors/currencyRateController';
import { selectContractExchangeRatesByChainId } from '../../../selectors/tokenRatesController';
import { selectTokensByChainIdAndWalletAddress } from '../../../selectors/tokensController';
import Routes from '../../../constants/navigation/Routes';
import { navigateToTransactionDetails } from '../../../util/navigation/navigateToTransactionDetails';
import { hasTransactionType } from '../../Views/confirmations/utils/transaction';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import {
  ACTIVITY_DETAIL_EVENTS,
  TransactionDetailLocation,
  getMonetizedPrimitive,
} from '../../../core/Analytics/events/transactions';
import { getTransactionTypeValue } from '../../../core/Engine/controllers/transaction-controller/metrics_properties/base';
import useDecodedTransaction from './hooks/useDecodedTransaction';
import TransactionElementView from './TransactionElementView';
import createStyles from './styles';

const NEW_TRANSACTION_DETAILS_TYPES = [
  TransactionType.musdClaim,
  TransactionType.musdConversion,
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.perpsWithdraw,
  TransactionType.predictClaim,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
];

const transactionElementPropTypes = {
  assetSymbol: PropTypes.string,
  /**
   * Asset object (in this case ERC721 token)
   */
  tx: PropTypes.object.isRequired,
  /**
   * InternalAccount object required to get import time name
   */
  selectedInternalAccount: PropTypes.object,
  /**
   * Internal accounts for the selected account group
   */
  selectSelectedAccountGroupInternalAccounts: PropTypes.array,
  /**
   * Current element of the list index
   */
  i: PropTypes.number,
  /**
   * Callback to render transaction details view
   */
  onPressItem: PropTypes.func,
  /**
   * Callback to speed up tx
   */
  onSpeedUpAction: PropTypes.func,
  /**
   * Callback to cancel tx
   */
  onCancelAction: PropTypes.func,
  swapsTransactions: PropTypes.object,
  signQRTransaction: PropTypes.func,
  cancelUnsignedQRTransaction: PropTypes.func,
  isQRHardwareAccount: PropTypes.bool,
  isLedgerAccount: PropTypes.bool,
  signLedgerTransaction: PropTypes.func,
  bridgeTxHistoryData: PropTypes.object.isRequired,
  /**
   * Chain Id
   */
  txChainId: PropTypes.string,
  /**
   * Selected wallet address for decoding and token map (optional override from parent)
   */
  selectedAddress: PropTypes.string,
  /**
   * Ticker
   */
  ticker: PropTypes.string,
  /**
   * Navigation object for routing
   */
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
  /**
   * Whether to render a bottom border for row separation (used in unified list)
   */
  showBottomBorder: PropTypes.bool,
  /**
   * All EVM transactions in controller state
   */
  transactions: PropTypes.arrayOf(PropTypes.object).isRequired,
  /**
   * Callback to track transaction detail click analytics
   */
  trackTransactionDetailClicked: PropTypes.func,
};

/**
 * Connected transaction item container for the transactions list.
 */
const TransactionElement = (props) => {
  const {
    assetSymbol,
    bridgeTxHistoryData,
    i,
    isLedgerAccount,
    isQRHardwareAccount,
    selectedAddress,
    selectedInternalAccount,
    selectSelectedAccountGroupInternalAccounts: selectedGroupAccounts,
    showBottomBorder,
    swapsTransactions,
    ticker,
    transactions,
    tx,
    txChainId,
  } = props;
  const theme = useContext(ThemeContext) || mockTheme;
  const styles = useMemo(
    () => createStyles(theme.colors, theme.typography),
    [theme.colors, theme.typography],
  );
  const mountedRef = useRef(false);
  const decodeProps = {
    ...props,
    assetSymbol,
    ticker,
  };
  const { transactionElement, transactionDetails } = useDecodedTransaction({
    props: decodeProps,
    txChainId,
    swapsTransactions,
    selectedAddress,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const showCancelModal = () => {
    mountedRef.current && props.onCancelAction(true, tx);
  };
  const showSpeedUpModal = () => {
    mountedRef.current && props.onSpeedUpAction(true, tx);
  };
  const showQRSigningModal = () => {
    mountedRef.current && props.signQRTransaction(tx);
  };
  const showLedgerSigninModal = () => {
    mountedRef.current && props.signLedgerTransaction(tx);
  };
  const cancelUnsignedQRTransaction = () => {
    mountedRef.current && props.cancelUnsignedQRTransaction(tx);
  };

  const onPressItem = () => {
    const bridgeTxHistoryItem = bridgeTxHistoryData?.bridgeTxHistoryItem;
    props.onPressItem && props.onPressItem(tx.id, i);
    props.trackTransactionDetailClicked &&
      props.trackTransactionDetailClicked();

    if (tx.type === TransactionType.bridge || bridgeTxHistoryItem) {
      handleUnifiedSwapsTxHistoryItemClick({
        navigation: props.navigation,
        evmTxMeta: tx,
        bridgeTxHistoryItem,
      });
    } else if (hasTransactionType(tx, NEW_TRANSACTION_DETAILS_TYPES)) {
      navigateToTransactionDetails(props.navigation, {
        transactionId: tx.id,
      });
    } else {
      props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.TRANSACTION_DETAILS,
        params: {
          tx,
          transactionElement,
          transactionDetails,
          showSpeedUpModal,
          showCancelModal,
        },
      });
    }
  };

  const onPressImportWalletTip = () => {
    props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.IMPORT_WALLET_TIP,
    });
  };

  const selectedAddresses = selectedGroupAccounts.map(
    (account) => account.address,
  );
  const incoming = selectedAddresses.includes(
    safeToChecksumAddress(tx.txParams.to),
  );
  const selfSent =
    incoming &&
    selectedAddresses.includes(safeToChecksumAddress(tx.txParams.from));
  const shouldShowFromDevice =
    (!incoming || selfSent) && tx.deviceConfirmedOn === WalletDevice.MM_MOBILE;
  const hasNonce = tx.txParams?.nonce;
  let txTime = `${toDateFormat(tx.time)}`;

  if (shouldShowFromDevice && hasNonce) {
    txTime = `#${parseInt(tx.txParams.nonce, 16)} - ${toDateFormat(
      tx.time,
    )} ${strings('transactions.from_device_label')}`;
  } else if (shouldShowFromDevice) {
    txTime = `${toDateFormat(tx.time)} ${strings(
      'transactions.from_device_label',
    )}`;
  }

  return (
    <TransactionElementView
      accountImportTime={selectedInternalAccount?.metadata.importTime}
      bridgeTxHistoryData={bridgeTxHistoryData}
      colors={theme.colors}
      i={i}
      isLedgerAccount={isLedgerAccount}
      isQRHardwareAccount={isQRHardwareAccount}
      onCancel={showCancelModal}
      onCancelUnsignedQR={cancelUnsignedQRTransaction}
      onImportWalletTip={onPressImportWalletTip}
      onPress={onPressItem}
      onSignLedger={showLedgerSigninModal}
      onSignQR={showQRSigningModal}
      onSpeedUp={showSpeedUpModal}
      showBottomBorder={showBottomBorder}
      styles={styles}
      transactionElement={transactionElement}
      transactionDetails={transactionDetails}
      transactions={transactions}
      tx={tx}
      txTime={txTime}
    />
  );
};

export { TransactionElement };

TransactionElement.propTypes = transactionElementPropTypes;

const mapStateToProps = (state, ownProps) => {
  const walletAddressForTokens =
    ownProps.selectedAddress ?? selectSelectedInternalAccountAddress(state);
  return {
    selectedInternalAccount: selectSelectedInternalAccount(state),
    selectSelectedAccountGroupInternalAccounts:
      selectSelectedAccountGroupInternalAccounts(state),
    primaryCurrency: selectPrimaryCurrency(state),
    swapsTransactions: selectSwapsTransactions(state),
    ticker: selectTickerByChainId(state, ownProps.txChainId),
    conversionRate: selectConversionRateByChainId(state, ownProps.txChainId),
    currencyRates: selectCurrencyRates(state),
    contractExchangeRates: selectContractExchangeRatesByChainId(
      state,
      ownProps.txChainId,
    ),
    tokens: selectTokensByChainIdAndWalletAddress(
      state,
      ownProps.txChainId,
      walletAddressForTokens,
    ),
  };
};

const TransactionElementWithBridge = (props) => {
  const bridgeTxHistoryData = useBridgeTxHistoryData({ evmTxMeta: props.tx });
  const transactions = useSelector(selectTransactions);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const trackTransactionDetailClicked = useCallback(() => {
    const tx = props.tx;
    const chainId = tx.chainId ?? '';
    const decimalChainId = getDecimalChainId(chainId);
    const monetizedPrimitive = getMonetizedPrimitive(tx.type);
    const destChainId =
      bridgeTxHistoryData?.bridgeTxHistoryItem?.quote?.destChainId;

    trackEvent(
      createEventBuilder(ACTIVITY_DETAIL_EVENTS.OPENED)
        .addProperties({
          transaction_type: getTransactionTypeValue(tx.type, tx),
          transaction_status: tx.status,
          location: props.location ?? TransactionDetailLocation.Home,
          chain_id_source: String(decimalChainId),
          chain_id_destination: String(destChainId ?? decimalChainId),
          ...(monetizedPrimitive && {
            monetized_primitive: monetizedPrimitive,
          }),
        })
        .build(),
    );
  }, [
    props.tx,
    props.location,
    bridgeTxHistoryData,
    trackEvent,
    createEventBuilder,
  ]);

  return (
    <TransactionElement
      {...props}
      bridgeTxHistoryData={bridgeTxHistoryData}
      transactions={transactions}
      trackTransactionDetailClicked={trackTransactionDetailClicked}
    />
  );
};

TransactionElementWithBridge.propTypes = {
  tx: PropTypes.object.isRequired,
  location: PropTypes.string,
};

export default connect(mapStateToProps)(TransactionElementWithBridge);
