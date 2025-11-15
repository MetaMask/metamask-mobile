import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { RootState } from '../../../../../reducers';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { isSendBundleSupported } from '../../../../../util/transactions/sentinel-api';
import { isRelaySupported } from '../../../../../util/transactions/transaction-relay';
import { isAtomicBatchSupported } from '../../../../../util/transaction-controller';
import { Hex } from '@metamask/utils';

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
 */
export function useIsGaslessSupported() {
  const transactionMeta = useTransactionMetadataRequest();

  const { chainId, txParams } = transactionMeta ?? {};
  const { from } = txParams ?? {};

  const isSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, chainId),
  );

  const { value: sendBundleSupportsChain } = useAsyncResult(
    async () => (chainId ? isSendBundleSupported(chainId) : false),
    [chainId],
  );

  const isSmartTransactionAndBundleSupported = Boolean(
    isSmartTransaction && sendBundleSupportsChain,
  );

  const { value: atomicBatchSupportResult } = useAsyncResult(async () => {
    if (isSmartTransactionAndBundleSupported) {
      return undefined;
    }

    return isAtomicBatchSupported({
      address: from as Hex,
      chainIds: [chainId as Hex],
    });
  }, [chainId, from, isSmartTransactionAndBundleSupported]);

  const { value: relaySupportsChain } = useAsyncResult(async () => {
    if (isSmartTransactionAndBundleSupported) {
      return undefined;
    }

    return isRelaySupported(chainId as Hex);
  }, [chainId, isSmartTransactionAndBundleSupported]);

  const atomicBatchChainSupport = atomicBatchSupportResult?.find(
    (result) => result.chainId.toLowerCase() === chainId?.toLowerCase(),
  );

  // Currently requires upgraded account, can also support no `delegationAddress` in future.
  const is7702Supported = Boolean(
    atomicBatchChainSupport?.isSupported &&
      relaySupportsChain &&
      // contract deployments can't be delegated
      txParams?.to !== undefined,
  );

  const isSupported = Boolean(
    isSmartTransactionAndBundleSupported || is7702Supported,
  );

  return {
    isSupported,
    isSmartTransaction,
  };
}
