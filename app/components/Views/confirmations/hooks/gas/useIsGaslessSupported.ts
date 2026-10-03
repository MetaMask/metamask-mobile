import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { isRelaySupported } from '../../../../../util/transactions/transaction-relay';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { isHardwareAccount } from '../../../../../util/address';
import { isAtomicBatchSupported } from '../../../../../util/transaction-controller';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';
import { useGaslessSupportedSmartTransactions } from './useGaslessSupportedSmartTransactions';

/**
 * Hook to determine if gasless transactions are supported for the current confirmation context.
 *
 * Gasless support can be enabled in two ways:
 * - Via Smart Transactions (sendBundle): Supported when smart transactions are enabled and sendBundle is supported for the chain. Works for all account types including hardware wallets, since only standard EIP-1559 signing is required.
 * - Via 7702 relay: Supported when the current account is upgraded, the chain supports atomic batch, relay is available, and the transaction is not a contract deployment. Hardware wallets are excluded from this path because they cannot sign EIP-7702 authorization lists.
 *
 * @returns An object containing:
 * - `isSupported`: `true` if gasless transactions are supported via either sendBundle or 7702.
 * - `isSmartTransaction`: `true` if smart transactions are enabled for the current chain.
 * - `pending`: `true` if the support check is still in progress.
 */
export function useIsGaslessSupported() {
  const transactionMeta = useTransactionMetadataRequest();
  const payingAccount = useTransactionPayingAccount();

  const { chainId, txParams } = transactionMeta ?? {};

  const {
    isSmartTransaction,
    isSupported: isSmartTransactionAndBundleSupported,
    pending: smartTransactionPending,
  } = useGaslessSupportedSmartTransactions();

  const shouldCheck7702Eligibility =
    !smartTransactionPending && !isSmartTransactionAndBundleSupported;

  const { value: relaySupportsChain, pending: relayPending } =
    useAsyncResult(async () => {
      if (!shouldCheck7702Eligibility) {
        return undefined;
      }

      if (!chainId || !payingAccount) {
        return false;
      }

      const relaySupported = await isRelaySupported(chainId as Hex);
      if (
        !relaySupported ||
        chainId.toLowerCase() !== CHAIN_IDS.MONAD.toLowerCase()
      ) {
        return relaySupported;
      }

      const atomicBatchSupport = await isAtomicBatchSupported({
        address: payingAccount,
        chainIds: [chainId as Hex],
      });
      const chainSupport = atomicBatchSupport.find(
        (result) => result.chainId.toLowerCase() === chainId.toLowerCase(),
      );

      return Boolean(chainSupport);
    }, [chainId, payingAccount, shouldCheck7702Eligibility]);

  const isHardwareWallet = Boolean(
    payingAccount && isHardwareAccount(payingAccount),
  );

  const is7702Supported = Boolean(
    !isHardwareWallet &&
      relaySupportsChain &&
      // contract deployments can't be delegated
      txParams?.to !== undefined,
  );

  const isSupported = Boolean(
    isSmartTransactionAndBundleSupported || is7702Supported,
  );

  const isPending =
    smartTransactionPending || (shouldCheck7702Eligibility && relayPending);

  return {
    isSupported,
    isSmartTransaction,
    pending: isPending,
  };
}
