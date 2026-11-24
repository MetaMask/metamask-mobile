import React, { useEffect, useState, useCallback } from 'react';
import { connect, useStore } from 'react-redux';
import PropTypes from 'prop-types';
import { useNavigation } from '@react-navigation/native';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { isStrictHexString } from '@metamask/utils';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { selectLocalActivityItemsByIdentifier } from '../../../../selectors/activity';
import decodeTransaction from '../../TransactionElement/utils';
import BaseNotification from '../../../../component-library/components-temp/BaseNotification';
import { collectibleContractsSelector } from '../../../../reducers/collectibles';
import {
  selectChainId,
  selectTickerByChainId,
} from '../../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectTokensByAddress } from '../../../../selectors/tokensController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { navigateToTransactionDetails } from '../../../../util/navigation/navigateToTransactionDetails';

const getOpenTransactionIdentifier = (route) => {
  if (route?.name === Routes.ACTIVITY_DETAILS) {
    return route.params?.txIdentifier;
  }
  if (route?.name === Routes.TRANSACTION_DETAILS) {
    return route.params?.transactionId;
  }
  return undefined;
};

function TransactionNotification(props) {
  const {
    currentNotification,
    onClose,
    onDismissComplete,
    dismissDuration,
    transactions,
    smartTransactions,
  } = props;

  const navigation = useNavigation();
  const store = useStore();
  const [transactionElement, setTransactionElement] = useState(undefined);
  const [tx, setTx] = useState({});

  const onPressNotification = useCallback(() => {
    onDismissComplete?.();

    const transactionId = currentNotification.transaction.id;
    const transaction = transactions.find(({ id }) => id === transactionId);

    const openIdentifier = getOpenTransactionIdentifier(
      NavigationService.navigation.getCurrentRoute(),
    )?.toLowerCase();
    if (
      openIdentifier &&
      [transactionId, transaction?.hash].some(
        (identifier) => identifier?.toLowerCase() === openIdentifier,
      )
    ) {
      return;
    }

    // The redesigned details only resolve the selected account's local activity;
    // anything else falls back to the confirmations details screen.
    const canOpenActivityDetails =
      isStrictHexString(transaction?.chainId) &&
      selectLocalActivityItemsByIdentifier(store.getState()).has(
        transactionId.toLowerCase(),
      );

    navigateToTransactionDetails(navigation, {
      transactionId,
      ...(canOpenActivityDetails
        ? { chainId: toEvmCaipChainId(transaction.chainId) }
        : {}),
    });
  }, [
    currentNotification.transaction.id,
    navigation,
    onDismissComplete,
    store,
    transactions,
  ]);

  const onCloseNotification = useCallback(() => {
    setTimeout(() => onClose(), 1000);
  }, [onClose]);

  useEffect(() => {
    async function getTransactionInfo() {
      const tx = transactions.find(
        ({ id }) => id === currentNotification.transaction.id,
      );

      if (!tx) return;

      const {
        selectedAddress,
        ticker,
        chainId,
        conversionRate,
        currentCurrency,
        exchangeRate,
        contractExchangeRates,
        collectibleContracts,
        tokens,
        primaryCurrency,
        swapsTransactions,
      } = props;

      const [transactionElement] = await decodeTransaction({
        ...props,
        tx,
        selectedAddress,
        ticker,
        chainId,
        conversionRate,
        currentCurrency,
        exchangeRate,
        contractExchangeRates,
        collectibleContracts,
        tokens,
        primaryCurrency,
        swapsTransactions,
      });
      setTx(tx);
      setTransactionElement(transactionElement);
    }
    getTransactionInfo();
  }, [
    transactions,
    smartTransactions,
    currentNotification.transaction.id,
    props,
  ]);

  useEffect(() => onCloseNotification(), [onCloseNotification]);

  const shouldSkipSubmittedSmartTransaction =
    tx.status === 'submitted' &&
    smartTransactions.some((stx) => stx.txHash === tx.hash);

  useEffect(() => {
    if (shouldSkipSubmittedSmartTransaction) {
      onDismissComplete?.();
    }
  }, [onDismissComplete, shouldSkipSubmittedSmartTransaction]);

  // Don't show submitted notification for STX b/c we only know when it's confirmed,
  // o/w a submitted notification will show up after it's confirmed, then a confirmed notification will show up immediately after
  if (shouldSkipSubmittedSmartTransaction) {
    return null;
  }

  return (
    <BaseNotification
      status={currentNotification.status}
      data={{
        ...tx?.txParams,
        ...currentNotification.transaction,
        title: transactionElement?.notificationKey,
      }}
      onPress={onPressNotification}
      onHide={onCloseNotification}
      onDismissComplete={onDismissComplete}
      dismissDuration={dismissDuration}
    />
  );
}

TransactionNotification.propTypes = {
  onClose: PropTypes.func,
  onDismissComplete: PropTypes.func,
  dismissDuration: PropTypes.number,
  currentNotification: PropTypes.object,
  swapsTransactions: PropTypes.object,
  /**
   * An array that represents the user transactions on chain
   */
  transactions: PropTypes.array,
  /**
   * An array that represents the user smart transactions on chain
   */
  smartTransactions: PropTypes.array,

  /**
   * String of selected address
   */
  selectedAddress: PropTypes.string,
  /**
   * Current provider ticker
   */
  ticker: PropTypes.string,
  /**
   * Current provider chainId
   */
  chainId: PropTypes.string,
  /**
   * ETH to current currency conversion rate
   */
  conversionRate: PropTypes.number,
  /**
   * Currency code of the currently-active currency
   */
  currentCurrency: PropTypes.string,
  /**
   * Current exchange rate
   */
  exchangeRate: PropTypes.number,
  /**
   * Object containing token exchange rates in the format address => exchangeRate
   */
  contractExchangeRates: PropTypes.object,
  /**
   * An array that represents the user collectible contracts
   */
  collectibleContracts: PropTypes.array,
  /**
   * An array that represents the user tokens
   */
  tokens: PropTypes.object,

  /**
   * Primary currency, either ETH or Fiat
   */
  primaryCurrency: PropTypes.string,
};

const mapStateToProps = (state, ownProps) => {
  const chainId = selectChainId(state);

  const { SmartTransactionsController, TransactionController } =
    state.engine.backgroundState;

  const smartTransactions =
    SmartTransactionsController?.smartTransactionsState?.smartTransactions?.[
      chainId
    ] || [];

  const tx = TransactionController.transactions.find(
    ({ id }) => id === ownProps?.currentNotification.transaction.id,
  );

  const ticker = selectTickerByChainId(state, tx?.chainId);
  return {
    selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
    transactions: TransactionController.transactions,
    ticker,
    chainId,
    tokens: selectTokensByAddress(state),
    collectibleContracts: collectibleContractsSelector(state),
    contractExchangeRates: selectContractExchangeRates(state),
    conversionRate: selectConversionRate(state),
    currentCurrency: selectCurrentCurrency(state),
    primaryCurrency: state.settings.primaryCurrency,
    swapsTransactions: TransactionController.swapsTransactions || {},
    smartTransactions,
  };
};

export default connect(mapStateToProps)(TransactionNotification);
