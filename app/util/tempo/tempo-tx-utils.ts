import { Hex } from '@metamask/utils';
import { accountSupports7702 } from '../transactions/account-supports-7702';
import { NetworkController } from '@metamask/network-controller';
import { KeyringController } from '@metamask/keyring-controller';
import Logger from '../../util/Logger';
import {
  TransactionParams,
  TransactionController as BaseTransactionController,
} from '@metamask/transaction-controller';
// Seem to be set by dApps only for batch calls.
// For single-txs, this type doesn't appear.
const TEMPO_TRANSACTION_TYPE: Hex = '0x76';

interface TempoConfig {
  perChainConfig: {
    [key: Hex]: {
      defaultFeeToken: { symbol: string; address: Hex };
    };
  };
}

const TEMPO_CONFIG: TempoConfig = {
  perChainConfig: {
    '0x1079': {
      defaultFeeToken: {
        address: '0x20c0000000000000000000000000000000000000',
        symbol: 'pathUSD',
      },
    },
    '0xa5bf': {
      defaultFeeToken: {
        address: '0x20c0000000000000000000000000000000000000',
        symbol: 'pathUSD',
      },
    },
  },
} as const;

interface TempoCall {
  to: Hex;
  // In our tests we see '0x' (probably to signal no native token),
  // However '0x' is invalid as a value and we use '0x0' when transforming.
  value: Hex | '0x';
  data: Hex;
}

interface TempoTransactionParams {
  from: Hex;
  type: '0x76';
  calls: TempoCall[];
  feeToken?: Hex;
}

export function buildBatchTransactionsFromTempoTransactionCalls(
  params: TempoTransactionParams,
) {
  return params.calls.map(({ data, to }) => ({
    params: {
      data,
      to,
      // Tempo Transactions 'calls' parameters differ in a least having '0x'
      // (probably to signal absence of native token) instead of '0x0'.
      value: '0x0' as Hex,
    },
  }));
}

const TEMPO_CHAINS = Object.keys(TEMPO_CONFIG.perChainConfig);

export function isTempoChain(chainId: Hex) {
  return TEMPO_CHAINS.includes(chainId);
}

export function getTempoExtraOptionsForChain(
  chainId: Hex,
): { gasFeeToken: Hex; excludeNativeTokenForFee: true } | {} {
  const tempoConfigForChain =
    isTempoChain(chainId) && TEMPO_CONFIG.perChainConfig[chainId];
  if (!tempoConfigForChain) {
    return {};
  }
  return {
    excludeNativeTokenForFee: true,
    gasFeeToken: tempoConfigForChain.defaultFeeToken.address,
  };
}

export function isTempoTransactionType(params: TransactionParams) {
  return params.type === TEMPO_TRANSACTION_TYPE;
}

export function checkIsValidTempoTransaction(
  params: TransactionParams,
): asserts params is TempoTransactionParams {
  if (!isTempoTransactionType(params)) {
    throw new Error(
      `Tempo Transaction: Transaction doesn't have Tempo transaction type (0x76)`,
    );
  }
  if (typeof params.from !== 'string' || !params.from.startsWith('0x')) {
    throw new Error(`Tempo Transaction: Missing or invalid field 'from'`);
  }
  if (
    !('calls' in params) ||
    !Array.isArray(params.calls) ||
    params.calls.length === 0
  ) {
    throw new Error(`Tempo Transaction: Missing or invalid field 'calls'`);
  }
}

export function getTempoEvmTransactionOptions({
  options,
  chainId,
}: {
  options: Parameters<BaseTransactionController['addTransaction']>[1];
  chainId: Hex;
}) {
  return {
    ...options,
    ...getTempoExtraOptionsForChain(chainId),
  };
}

export function getTempoTransactionBatchArgs({
  transaction,
  options,
  chainId,
}: {
  transaction: TransactionParams;
  options: Parameters<BaseTransactionController['addTransaction']>[1];
  chainId: Hex;
}) {
  const chainTempoConfig = TEMPO_CONFIG.perChainConfig[chainId];
  if (!chainTempoConfig) {
    throw new Error(`Tempo transactions not supported for chain: ${chainId}`);
  }
  checkIsValidTempoTransaction(transaction);
  return {
    ...options,
    from: transaction.from,
    transactions: buildBatchTransactionsFromTempoTransactionCalls(transaction),
    // If no token is provided, we force a default one so we don't fall in
    // fee preference algo: https://docs.tempo.xyz/protocol/fees/spec-fee#fee-token-preferences
    gasFeeToken:
      transaction.feeToken || chainTempoConfig.defaultFeeToken.address,
    excludeNativeTokenForFee: true,
  };
}

export async function getAddTransactionSendCallExtraOptions({
  req,
  networkController,
  keyringController,
}: {
  req: {
    networkClientId: string;
    params?: [{ from: string }];
  };
  networkController: NetworkController;
  keyringController: KeyringController;
}) {
  /**
   * Gets chain-specific parameters that need to be injected in addTransaction/addTransactionBatch.
   * Done initially for Tempo.
   * Done gracefully - silencing errors - so it doesn't impact previous behavior.
   * Skipped in case of account not supporting EIP-7702, such as hardware wallets.
   */
  try {
    const networkConfiguration =
      networkController.getNetworkConfigurationByNetworkClientId(
        req.networkClientId,
      );
    if (!networkConfiguration) {
      Logger.log(
        `addTransactionSendCallExtraOptions: No networkConfiguration for networkClientId ${req.networkClientId}`,
      );
      return {};
    }
    const { chainId: currentRequestChainId } = networkConfiguration;
    if (!isTempoChain(currentRequestChainId)) {
      return {};
    }
    const isEip7702SupportedByAccount = await accountSupports7702(
      req.params?.[0]?.from,
      keyringController,
    );
    if (!isEip7702SupportedByAccount) {
      Logger.log(
        'addTransactionSendCallExtraOptions: Tempo chain but wallet does not support 7702. Falling back to legacy transactions',
      );
      return {};
    }
    return getTempoExtraOptionsForChain(currentRequestChainId);
  } catch (err) {
    Logger.log(
      'addTransactionSendCallExtraOptions: Error while getting addTransaction extra options',
      err,
    );
    return {};
  }
}
