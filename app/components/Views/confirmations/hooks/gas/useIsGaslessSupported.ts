import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectSmartTransactionsEnabled } from '../../../../../selectors/smartTransactionsController';
import { RootState } from '../../../../../reducers';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { isSendBundleSupported } from '../../../../../core/RPCMethods/sentinel-api';
import { isRelaySupported } from '../../../../../core/RPCMethods/transaction-relay';
import { isAtomicBatchSupported } from '../../../../../util/transaction-controller';
import { Hex } from '@metamask/utils';

export function useIsGaslessSupported() {
  const transactionMeta = useTransactionMetadataRequest();

  const { chainId, txParams } = transactionMeta ?? {};
  const { from } = txParams ?? {};

  const isSmartTransaction = useSelector((state: RootState) =>
    selectSmartTransactionsEnabled(state, chainId),
  );

  const { value: atomicBatchSupportResult } = useAsyncResult(async () => {
    if (isSmartTransaction) {
      return undefined;
    }

    return isAtomicBatchSupported({
      address: from as Hex,
      chainIds: [chainId as Hex],
    });
  }, [chainId, from, isSmartTransaction]);

  const { value: relaySupportsChain } = useAsyncResult(async () => {
    if (isSmartTransaction) {
      return undefined;
    }

    return isRelaySupported(chainId as Hex);
  }, [chainId, isSmartTransaction]);

  const { value: sendBundleSupportsChain } = useAsyncResult(
    async () => (chainId ? isSendBundleSupported(chainId) : false),
    [chainId],
  );

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
    (isSmartTransaction && sendBundleSupportsChain) || is7702Supported,
  );

  return {
    isSupported,
    isSmartTransaction,
  };
}
