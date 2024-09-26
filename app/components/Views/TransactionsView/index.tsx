import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Transactions from '../../UI/Transactions';
import {
  TX_UNAPPROVED,
  TX_SUBMITTED,
  TX_SIGNED,
  TX_PENDING,
  TX_CONFIRMED,
} from '../../../constants/transaction';
import { addAccountTimeFlagFilter } from '../../../util/transactions';
import { toLowerCaseEquals } from '../../../util/general';
import { safeToChecksumAddress } from '../../../util/address';
import { NETWORK_ID_LOADING } from '../../../core/redux/slices/inpageProvider';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import {
  selectChainId,
  selectProviderType,
} from '../../../selectors/networkController';
import { selectTokens } from '../../../selectors/tokensController';
import { selectNonReplacedTransactions } from '../../../selectors/transactionController';
import { selectPendingSmartTransactionsBySender } from '../../../selectors/smartTransactionsController';
import {
  filterByAddressAndNetwork,
  sortTransactions,
} from '../../../util/activity';
import { store } from '../../../store';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});

interface Transaction {
  id: string;
  status: string;
  txParams: {
    from: string;
    nonce: string;
  };
  time: number;
  insertImportTime?: boolean;
}

interface Token {
  address: string;
}

const TransactionsView: React.FC = () => {
  const navigation = useNavigation();

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [submittedTxs, setSubmittedTxs] = useState<Transaction[]>([]);
  const [confirmedTxs, setConfirmedTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const networkType = useSelector(selectProviderType);
  const chainId = useSelector(selectChainId);
  const tokens = useSelector(selectTokens);
  const nonReplacedTransactions = useSelector(selectNonReplacedTransactions);
  const pendingSmartTransactions = useSelector(
    selectPendingSmartTransactionsBySender,
  );

  const transactions = [
    ...nonReplacedTransactions,
    ...pendingSmartTransactions,
  ].sort((a, b) => (b.time ?? 0) - (a.time ?? 0));

  const selectedAddress = toChecksumHexAddress(
    selectedInternalAccount?.address,
  );

  const filterTransactions = useCallback(
    (networkId: string) => {
      if (networkId === NETWORK_ID_LOADING) return;

      let accountAddedTimeInsertPointFound = false;
      const addedAccountTime = selectedInternalAccount?.metadata.importTime;

      const submittedTxs: Transaction[] = [];
      const confirmedTxs: Transaction[] = [];
      const submittedNonces: string[] = [];

      const allTransactionsSorted = sortTransactions(transactions).filter(
        (tx, index, self) =>
          self.findIndex((_tx) => _tx.id === tx.id) === index,
      );

      const allTransactions = allTransactionsSorted.filter((tx) => {
        const filter = filterByAddressAndNetwork(
          tx,
          tokens,
          selectedAddress ?? '',
          networkId,
          chainId,
        );

        if (!filter) return false;

        tx.insertImportTime = addAccountTimeFlagFilter(
          tx,
          (addedAccountTime ?? {}) as object,
          { found: accountAddedTimeInsertPointFound },
        );
        if (tx.insertImportTime) accountAddedTimeInsertPointFound = true;

        switch (tx.status) {
          case TX_SUBMITTED:
          case TX_SIGNED:
          case TX_UNAPPROVED:
          case TX_PENDING:
            submittedTxs.push(tx);
            return false;
          case TX_CONFIRMED:
            confirmedTxs.push(tx);
            break;
        }

        return filter;
      });

      const submittedTxsFiltered = submittedTxs.filter(({ txParams }) => {
        const { from, nonce } = txParams;
        if (!toLowerCaseEquals(from, selectedAddress)) {
          return false;
        }
        const alreadySubmitted = submittedNonces.includes(nonce);
        const alreadyConfirmed = confirmedTxs.find(
          (tx) =>
            toLowerCaseEquals(
              safeToChecksumAddress(tx.txParams.from),
              selectedAddress,
            ) && tx.txParams.nonce === nonce,
        );
        if (alreadyConfirmed) {
          return false;
        }
        submittedNonces.push(nonce);
        return !alreadySubmitted;
      });

      if (!accountAddedTimeInsertPointFound && allTransactions.length) {
        allTransactions[allTransactions.length - 1].insertImportTime = true;
      }

      setAllTransactions(allTransactions);
      setSubmittedTxs(submittedTxsFiltered);
      setConfirmedTxs(confirmedTxs);
      setLoading(false);
    },
    [transactions, selectedInternalAccount, selectedAddress, tokens, chainId],
  );

  useEffect(() => {
    setLoading(true);
    InteractionManager.runAfterInteractions(() => {
      const { networkId } = store.getState().inpageProvider;
      filterTransactions(networkId);
    });
  }, [filterTransactions]);

  return (
    <View
      style={styles.wrapper}
      testID={loading ? 'transactions-loading' : 'transactions-view'}
    >
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

export default TransactionsView;
