import { useQuery } from '@tanstack/react-query';
import { Hex } from '@metamask/utils';

import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isRelaySupported } from '../../../../../util/transactions/transaction-relay';
import { isHardwareAccount } from '../../../../../util/address';
import { useGaslessSupportedSmartTransactions } from './useGaslessSupportedSmartTransactions';

/**
 * Hook to determine if gasless transactions are supported for the current confirmation context.
 *
 * Gasless support can be enabled in two ways:
 * - Via 7702: Supported when the current account is upgraded, the chain supports atomic batch, relay is available, and the transaction is not a contract deployment.
 * - Via Smart Transactions: Supported when smart transactions are enabled and sendBundle is supported for the chain.
 *
 * @returns An object containing:
 * - `isSupported`: `true` if gasless transactions are supported via either 7702 or smart transactions with sendBundle.
 * - `isSmartTransaction`: `true` if smart transactions are enabled for the current chain.
 * - `pending`: `true` if the support check is still in progress.
 */
export function useIsGaslessSupported() {
  const transactionMeta = useTransactionMetadataRequest();

  const { txParams, chainId } = transactionMeta ?? {};

  const {
    isSmartTransaction,
    isSupported: isSmartTransactionAndBundleSupported,
    pending: smartTransactionPending,
  } = useGaslessSupportedSmartTransactions();

  const shouldCheck7702Eligibility =
    !smartTransactionPending && !isSmartTransactionAndBundleSupported;

  const { data: relaySupportsChain, isFetching: relayPending } = useQuery({
    queryKey: ['relaySupportsChain', chainId],
    queryFn: () => isRelaySupported(chainId as Hex),
    enabled: shouldCheck7702Eligibility && Boolean(chainId),
  });
  const is7702Supported = Boolean(
    relaySupportsChain &&
      // contract deployments can't be delegated
      txParams?.to !== undefined,
  );

  const fromAddress = txParams?.from;
  const isHardwareWallet = Boolean(
    fromAddress && isHardwareAccount(fromAddress),
  );

  const isSupported =
    !isHardwareWallet &&
    Boolean(isSmartTransactionAndBundleSupported || is7702Supported);

  const is7702SupportedPending = shouldCheck7702Eligibility && relayPending;
  const pending = smartTransactionPending || is7702SupportedPending;

  return {
    isSupported,
    isSmartTransaction,
    pending,
  };
}
