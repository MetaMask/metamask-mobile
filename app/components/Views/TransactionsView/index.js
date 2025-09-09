import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { connect, useSelector } from 'react-redux';
import { KnownCaipNamespace } from '@metamask/utils';
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
} from '../../../util/activity';
import { areAddressesEqual } from '../../../util/address';
import { addAccountTimeFlagFilter } from '../../../util/transactions';
import {
  selectChainId,
  selectIsPopularNetwork,
  selectProviderType,
  selectSelectedNetworkClientId,
} from '../../../selectors/networkController';
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
import { selectTokenNetworkFilter } from '../../../selectors/preferencesController';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PopularList } from '../../../util/networks/customNetworks';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../util/networks';
import useCurrencyRatePolling from '../../hooks/AssetPolling/useCurrencyRatePolling';
import useTokenRatesPolling from '../../hooks/AssetPolling/useTokenRatesPolling';
import { useNavigation } from '@react-navigation/native';

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
  chainId,
  tokens,
  tokenNetworkFilter,
}) => {
  const [allTransactions, setAllTransactions] = useState([]);
  const [submittedTxs, setSubmittedTxs] = useState([]);
  const [confirmedTxs, setConfirmedTxs] = useState([]);
  const [loading, setLoading] = useState();
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const enabledNetworksByNamespace = useSelector(
    selectEnabledNetworksByNamespace,
  );

  useCurrencyRatePolling();
  useTokenRatesPolling();

  const selectedAddress = toChecksumHexAddress(
    selectedInternalAccount?.address,
  );

  const isPopularNetwork = useSelector(selectIsPopularNetwork);

  const filterTransactions = useCallback(
    (networkId) => {
      let accountAddedTimeInsertPointFound = false;
      const addedAccountTime = selectedInternalAccount?.metadata.importTime;

      const submittedTxs = [];
      const confirmedTxs = [];
      const submittedNonces = [];

      const allTransactionsSorted = sortTransactions(transactions).filter(
        (tx, index, self) =>
          self.findIndex((_tx) => _tx.id === tx.id) === index,
      );

      const allTransactions = allTransactionsSorted.filter((tx) => {
        const filter = filterByAddressAndNetwork(
          tx,
          tokens,
          selectedAddress,
          tokenNetworkFilter,
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

      let allTransactionsFiltered;
      if (isRemoveGlobalNetworkSelectorEnabled()) {
        // TODO: Make sure to come back and check on how Solana transactions are handled
        allTransactionsFiltered = allTransactions.filter((tx) => {
          const chainId = tx.chainId;
          return enabledNetworksByNamespace[KnownCaipNamespace.Eip155]?.[
            chainId
          ];
        });
      } else {
        allTransactionsFiltered = isPopularNetwork
          ? allTransactions.filter(
              (tx) =>
                tx.chainId === CHAIN_IDS.MAINNET ||
                tx.chainId === CHAIN_IDS.LINEA_MAINNET ||
                PopularList.some((network) => network.chainId === tx.chainId),
            )
          : allTransactions.filter((tx) => tx.chainId === chainId);
      }

      const submittedTxsFiltered = submittedTxs.filter(({ txParams }) => {
        const { from, nonce } = txParams;
        if (!areAddressesEqual(from, selectedAddress)) {
          return false;
        }
        const alreadySubmitted = submittedNonces.includes(nonce);
        const alreadyConfirmed = confirmedTxs.find(
          (tx) =>
            areAddressesEqual(tx.txParams.from, selectedAddress) &&
            tx.txParams.nonce === nonce,
        );
        if (alreadyConfirmed) {
          return false;
        }
        submittedNonces.push(nonce);
        return !alreadySubmitted;
      });

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
    },
    [
      transactions,
      selectedInternalAccount,
      selectedAddress,
      tokens,
      chainId,
      tokenNetworkFilter,
      isPopularNetwork,
      enabledNetworksByNamespace,
    ],
  );

  useEffect(() => {
    setLoading(true);

    if (selectedNetworkClientId) {
      filterTransactions(selectedNetworkClientId);
    }
  }, [filterTransactions, selectedNetworkClientId]);

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
   * Current chainId
   */
  chainId: PropTypes.string,
  /**
   * Array of network tokens filter
   */
  tokenNetworkFilter: PropTypes.object,
};

const mapStateToProps = (state) => {
  const chainId = selectChainId(state);
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
    chainId,
    tokenNetworkFilter: isRemoveGlobalNetworkSelectorEnabled()
      ? selectEVMEnabledNetworks(state).reduce(
          (acc, network) => ({ ...acc, [network]: true }),
          {},
        )
      : selectTokenNetworkFilter(state),
  };
};

const mapDispatchToProps = (dispatch) => ({
  showAlert: (config) => dispatch(showAlert(config)),
});

const TransactionsViewWrapper = (props) => {
  const navigation = useNavigation();
  return <TransactionsView {...props} navigation={navigation} />;
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(TransactionsViewWrapper);
