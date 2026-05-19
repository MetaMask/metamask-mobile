import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyActivityMockDataEnabledFlag } from '../selectors/featureFlags';
import MOCK_MONEY_TRANSACTIONS from '../constants/mockActivityData';
import {
  isMoneyActivityDeposit,
  isMoneyActivityTransfer,
  isMusdErc20Transfer,
} from '../constants/moneyActivityFilters';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { areAddressesEqual } from '../../../../util/address';
import { decodeTransferData } from '../../../../util/transactions';
import { isMusdToken } from '../../Earn/constants/musd';

/**
 * For a `tokenMethodTransfer`, the call's recipient lives in the ERC-20
 * `transfer(address,uint256)` calldata, not in `txParams.to` (which is the
 * token contract). Returns `undefined` if the calldata is missing or malformed.
 */
function getErc20TransferRecipient(tx: TransactionMeta): string | undefined {
  const data = tx.txParams?.data;
  if (!data) return undefined;
  try {
    const [recipient] = decodeTransferData('transfer', data) as string[];
    return recipient;
  } catch {
    return undefined;
  }
}

export interface UseMoneyAccountTransactionsResult {
  /** Confirmed + submitted (filtered) merged, sorted by time descending */
  allTransactions: TransactionMeta[];
  /** Confirmed deposits (incoming) and submitted incoming */
  deposits: TransactionMeta[];
  /** Confirmed transfers (outgoing) and submitted outgoing */
  transfers: TransactionMeta[];
  /** Transactions awaiting confirmation (not in a final on-chain state) */
  submittedTransactions: TransactionMeta[];
  moneyAddress: string | undefined;
  // TODO: remove this after design implementation of the activity view is done
  mockDataEnabled: boolean;
}

/**
 * Money account activity. When `moneyActivityMockDataEnabled` is on (remote or
 * `MM_MONEY_ACTIVITY_MOCK_DATA_ENABLED`), returns static mock rows for UI/QA.
 * Otherwise reads real transactions from TransactionController, filtered to
 * those involving the primary Money account address.
 */
export function useMoneyAccountTransactions(): UseMoneyAccountTransactionsResult {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const mockDataEnabled = useSelector(selectMoneyActivityMockDataEnabledFlag);
  const nonReplacedTransactions = useSelector(selectNonReplacedTransactions);

  const moneyAddress = useMemo(() => {
    const raw = primaryMoneyAccount?.address;
    return raw ? toChecksumHexAddress(raw) : undefined;
  }, [primaryMoneyAccount]);

  return useMemo(() => {
    if (mockDataEnabled) {
      const allTransactions = [...MOCK_MONEY_TRANSACTIONS];
      return {
        allTransactions,
        deposits: allTransactions.filter(isMoneyActivityDeposit),
        transfers: allTransactions.filter(isMoneyActivityTransfer),
        submittedTransactions: [],
        moneyAddress,
        mockDataEnabled: true,
      };
    }

    const moneyTransactions = nonReplacedTransactions
      .filter((tx) => {
        // Direct Money account transactions.
        if (
          tx.type === TransactionType.moneyAccountDeposit ||
          tx.type === TransactionType.moneyAccountWithdraw
        ) {
          return true;
        }
        // EIP-7702 batch where a Money account call is a nested call.
        if (
          tx.nestedTransactions?.some(
            (nested) =>
              nested.type === TransactionType.moneyAccountDeposit ||
              nested.type === TransactionType.moneyAccountWithdraw,
          )
        ) {
          return true;
        }
        if (moneyAddress === undefined) return false;
        // Inbound mUSD landing at the money account (from incoming-transaction
        // polling — `transferInformation.contractAddress` is the token, and
        // `txParams.to` is the recipient).
        if (
          tx.type === TransactionType.incoming &&
          isMusdToken(tx.transferInformation?.contractAddress) &&
          tx.txParams?.to !== undefined &&
          areAddressesEqual(tx.txParams.to, moneyAddress)
        ) {
          return true;
        }
        // Locally-signed `transfer()` of mUSD whose call recipient is the
        // money account (e.g. user's EOA depositing into Money).
        if (
          tx.type === TransactionType.tokenMethodTransfer &&
          isMusdErc20Transfer(tx)
        ) {
          const recipient = getErc20TransferRecipient(tx);
          if (
            recipient !== undefined &&
            areAddressesEqual(recipient, moneyAddress)
          ) {
            return true;
          }
        }
        return false;
      })
      .sort((a, b) => (b?.time ?? 0) - (a?.time ?? 0));

    const submittedTransactions = moneyTransactions.filter(
      (tx) => tx.status === TransactionStatus.submitted,
    );

    return {
      allTransactions: moneyTransactions,
      deposits: moneyTransactions.filter(isMoneyActivityDeposit),
      transfers: moneyTransactions.filter(isMoneyActivityTransfer),
      submittedTransactions,
      moneyAddress,
      mockDataEnabled: false,
    };
  }, [mockDataEnabled, moneyAddress, nonReplacedTransactions]);
}
