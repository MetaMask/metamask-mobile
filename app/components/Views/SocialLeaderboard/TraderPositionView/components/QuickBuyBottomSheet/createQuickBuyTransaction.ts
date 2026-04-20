import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../../../core/Engine';
import { generateTransferData } from '../../../../../../util/transactions';
import { QUICK_BUY_TX_TYPE } from './quickBuyTransactionType';

interface CreateQuickBuyTransactionParams {
  /**
   * Destination chain for the token being bought. The self-transfer executes
   * on this chain once Pay delivers the destination token.
   */
  destChainId: Hex;
  /** Contract address of the destination token (what the user is buying). */
  destTokenAddress: Hex;
  /** The buyer's wallet address on the destination chain. */
  fromAddress: Hex;
  /** ERC-20 transfer amount in hex (prefixed or unprefixed). */
  amountHex: string;
  /** Optional cached network client ID to avoid re-resolving. */
  networkClientId?: string;
}

interface RegisterQuickBuyTokenParams {
  chainId: Hex;
  tokenAddress: Hex;
  decimals: number;
  symbol: string;
  name?: string;
  networkClientId?: string;
}

/**
 * Ensures the destination token is registered in `TokensController` so that
 * `TransactionPayController` can identify it as a required token when the
 * Quick Buy transaction is added.
 *
 * Mirrors `ensureMusdTokenRegistered` in
 * `app/components/UI/Earn/utils/musdConversionTransaction.ts`.
 */
export async function ensureQuickBuyTokenRegistered({
  chainId,
  tokenAddress,
  decimals,
  symbol,
  name,
  networkClientId,
}: RegisterQuickBuyTokenParams): Promise<void> {
  const { TokensController, NetworkController } = Engine.context;

  const resolvedNetworkClientId =
    networkClientId ?? NetworkController.findNetworkClientIdByChainId(chainId);

  if (!resolvedNetworkClientId) {
    return;
  }

  const { allTokens } = TokensController.state;
  const accountTokens = Object.values(allTokens[chainId] ?? {}).flat();
  const hasToken = accountTokens.some(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
  );

  if (hasToken) {
    return;
  }

  await TokensController.addToken({
    address: tokenAddress,
    decimals,
    symbol,
    name,
    networkClientId: resolvedNetworkClientId,
  });
}

function buildQuickBuyTx(params: {
  destChainId: Hex;
  destTokenAddress: Hex;
  fromAddress: Hex;
  amountHex: string;
  networkClientId: string;
}): {
  txParams: { to: Hex; from: Hex; data: Hex; value: '0x0' };
  addTxOptions: {
    skipInitialGasEstimate: true;
    networkClientId: string;
    origin: typeof ORIGIN_METAMASK;
    type: typeof QUICK_BUY_TX_TYPE;
  };
} {
  const { destTokenAddress, fromAddress, amountHex, networkClientId } = params;

  const transferData = generateTransferData('transfer', {
    toAddress: fromAddress,
    amount: amountHex,
  }) as Hex;

  return {
    txParams: {
      to: destTokenAddress,
      from: fromAddress,
      data: transferData,
      value: '0x0',
    },
    addTxOptions: {
      skipInitialGasEstimate: true,
      networkClientId,
      origin: ORIGIN_METAMASK,
      type: QUICK_BUY_TX_TYPE,
    },
  };
}

/**
 * Creates an unapproved `quickBuy` transaction that represents a self-transfer
 * of the destination token on its chain. `TransactionPayController` sources
 * funds via the selected Pay token (swap/bridge through Relay) so the
 * self-transfer succeeds on-chain once the destination token is delivered.
 */
export async function createQuickBuyTransaction({
  destChainId,
  destTokenAddress,
  fromAddress,
  amountHex,
  networkClientId,
}: CreateQuickBuyTransactionParams): Promise<{
  transactionId: string;
  networkClientId: string;
}> {
  const { NetworkController, TransactionController } = Engine.context;

  const resolvedNetworkClientId =
    networkClientId ??
    NetworkController.findNetworkClientIdByChainId(destChainId);

  if (!resolvedNetworkClientId) {
    throw new Error(
      `[Quick Buy] Network client not found for chain ID: ${destChainId}`,
    );
  }

  const { txParams, addTxOptions } = buildQuickBuyTx({
    destChainId,
    destTokenAddress,
    fromAddress,
    amountHex,
    networkClientId: resolvedNetworkClientId,
  });

  const { transactionMeta } = await TransactionController.addTransaction(
    txParams,
    addTxOptions,
  );

  return {
    transactionId: transactionMeta.id,
    networkClientId: resolvedNetworkClientId,
  };
}
