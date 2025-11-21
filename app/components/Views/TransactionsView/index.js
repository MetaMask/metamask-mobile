import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { connect, useSelector } from 'react-redux';
import { KnownCaipNamespace } from '@metamask/utils';
import { withNavigation } from '@react-navigation/compat';
import { showAlert } from '../../../actions/alert';
import Transactions from '../../UI/Transactions';
import {
  TX_UNAPPROVED,
  TX_SUBMITTED,
  TX_SIGNED,
  TX_PENDING,
  TX_CONFIRMED,
} from '../../../constants/transaction';
import {
  sortTransactions,
  filterByAddressAndNetwork,
  isTransactionOnChains,
} from '../../../util/activity';
import { areAddressesEqual } from '../../../util/address';
import { addAccountTimeFlagFilter } from '../../../util/transactions';
import { selectProviderType } from '../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectTokens } from '../../../selectors/tokensController';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectSortedTransactions } from '../../../selectors/transactionController';
import {
  selectEnabledNetworksByNamespace,
  selectEVMEnabledNetworks,
} from '../../../selectors/networkEnablementController';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectNonEvmTransactions } from '../../../selectors/multichain';
import { isEvmAccountType } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF
import { toChecksumHexAddress } from '@metamask/controller-utils';
import useCurrencyRatePolling from '../../hooks/AssetPolling/useCurrencyRatePolling';
import useTokenRatesPolling from '../../hooks/AssetPolling/useTokenRatesPolling';
import { selectBridgeHistoryForAccount } from '../../../selectors/bridgeStatusController';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});

const TransactionsView = ({
  navigation,
  conversionRate,
  selectedInternalAccount,
  networkType,
  currentCurrency,
  transactions,
  tokens,
  tokenNetworkFilter,
}) => {
  const [allTransactions, setAllTransactions] = useState([]);
  const [submittedTxs, setSubmittedTxs] = useState([]);
  const [confirmedTxs, setConfirmedTxs] = useState([]);
  const [loading, setLoading] = useState();
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);

  const enabledNetworksByNamespace = useSelector(
    selectEnabledNetworksByNamespace,
  );

  useCurrencyRatePolling();
  useTokenRatesPolling();

  const selectedAddress = toChecksumHexAddress(
    selectedInternalAccount?.address,
  );

  const filterTransactions = useCallback(() => {
    let accountAddedTimeInsertPointFound = false;
    const addedAccountTime = selectedInternalAccount?.metadata.importTime;

    const submittedTxs = [];
    const confirmedTxs = [];
    const submittedNonces = [];

    const allTransactionsSorted = sortTransactions(transactions).filter(
      (tx, index, self) => self.findIndex((_tx) => _tx.id === tx.id) === index,
    );

    const allTransactions = allTransactionsSorted.filter((tx) => {
      const filter = filterByAddressAndNetwork(
        tx,
        tokens,
        selectedAddress,
        tokenNetworkFilter,
        allTransactionsSorted,
        bridgeHistory,
      );

      if (!filter) return false;

      const insertImportTime = addAccountTimeFlagFilter(
        tx,
        addedAccountTime,
        accountAddedTimeInsertPointFound,
      );

      // Create a new transaction object with the insertImportTime property
      const updatedTx = {
        ...tx,
        insertImportTime,
      };

      if (updatedTx.insertImportTime) accountAddedTimeInsertPointFound = true;

      switch (tx.status) {
        case TX_SUBMITTED:
        case TX_SIGNED:
        case TX_UNAPPROVED:
        case TX_PENDING:
          submittedTxs.push(updatedTx);
          return false;
        case TX_CONFIRMED:
          confirmedTxs.push(updatedTx);
          break;
      }

      return filter;
    });

    // TODO: Make sure to come back and check on how Solana transactions are handled
    const allTransactionsFiltered = allTransactions.filter((tx) => {
      const enabledChainIds = Object.entries(
        enabledNetworksByNamespace?.[KnownCaipNamespace.Eip155] ?? {},
      )
        .filter(([, enabled]) => enabled)
        .map(([chainId]) => chainId);

      return isTransactionOnChains(tx, enabledChainIds, allTransactionsSorted);
    });

    const submittedTxsFiltered = submittedTxs.filter(
      ({ chainId, txParams }) => {
        const { from, nonce } = txParams;

        if (!areAddressesEqual(from, selectedAddress)) {
          return false;
        }

        const nonceKey = `${chainId}-${nonce}`;
        const alreadySubmitted = submittedNonces.includes(nonceKey);
        const alreadyConfirmed = confirmedTxs.find(
          (tx) =>
            areAddressesEqual(tx.txParams.from, selectedAddress) &&
            tx.chainId === chainId &&
            tx.txParams.nonce === nonce,
        );

        if (alreadyConfirmed) {
          return false;
        }

        submittedNonces.push(nonceKey);
        return !alreadySubmitted;
      },
    );

    // If the account added insert point is not found, add it to the last transaction
    if (
      !accountAddedTimeInsertPointFound &&
      allTransactionsFiltered &&
      allTransactionsFiltered.length
    ) {
      const lastIndex = allTransactionsFiltered.length - 1;
      allTransactionsFiltered[lastIndex] = {
        ...allTransactionsFiltered[lastIndex],
        insertImportTime: true,
      };
    }

    setAllTransactions(allTransactionsFiltered);
    setSubmittedTxs(submittedTxsFiltered);
    setConfirmedTxs(confirmedTxs);
    setLoading(false);
  }, [
    transactions,
    selectedInternalAccount,
    selectedAddress,
    tokens,
    tokenNetworkFilter,
    enabledNetworksByNamespace,
    bridgeHistory,
  ]);

  useEffect(() => {
    setLoading(true);
    filterTransactions();
  }, [filterTransactions]);

  return (
    <View style={styles.wrapper}>
      <Transactions
        navigation={navigation}
        transactions={allTransactions}
        submittedTransactions={submittedTxs}
        confirmedTransactions={confirmedTxs}
        conversionRate={conversionRate}
        currentCurrency={currentCurrency}
        selectedAddress={selectedAddress}
        networkType={networkType}
        loading={loading}
      />
    </View>
  );
};

TransactionsView.propTypes = {
  /**
   * ETH to current currency conversion rate
   */
  conversionRate: PropTypes.number,
  /**
   * Currency code of the currently-active currency
   */
  currentCurrency: PropTypes.string,
  /**
   * InternalAccount object required to get account name, address and import time
   */
  selectedInternalAccount: PropTypes.object,
  /**
   * navigation object required to push new views
   */
  navigation: PropTypes.object,
  /**
   * An array that represents the user transactions
   */
  transactions: PropTypes.array,
  /**
   * A string represeting the network name
   */
  networkType: PropTypes.string,
  /**
   * Array of ERC20 assets
   */
  tokens: PropTypes.array,
  /**
   * Array of network tokens filter
   */
  tokenNetworkFilter: PropTypes.object,
};

const mapStateToProps = (state) => {
  const selectedInternalAccount = selectSelectedInternalAccount(state);
  const evmTransactions = selectSortedTransactions(state);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  let allTransactions = evmTransactions;
  if (
    selectedInternalAccount &&
    !isEvmAccountType(selectedInternalAccount.type)
  ) {
    const nonEVMTransactions = selectNonEvmTransactions(state);
    const txs = nonEVMTransactions?.transactions || [];

    allTransactions = [...evmTransactions, ...txs].sort(
      (a, b) => (b?.time ?? 0) - (a?.time ?? 0),
    );
  }
  ///: END:ONLY_INCLUDE_IF

  return {
    conversionRate: selectConversionRate(state),
    currentCurrency: selectCurrentCurrency(state),
    tokens: selectTokens(state),
    selectedInternalAccount,
    transactions: allTransactions,
    networkType: selectProviderType(state),
    tokenNetworkFilter: selectEVMEnabledNetworks(state).reduce(
      (acc, network) => ({ ...acc, [network]: true }),
      {},
    ),
  };
};

const mapDispatchToProps = (dispatch) => ({
  showAlert: (config) => dispatch(showAlert(config)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withNavigation(TransactionsView));
