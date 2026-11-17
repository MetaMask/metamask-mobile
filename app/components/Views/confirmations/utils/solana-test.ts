import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { SolScope } from '@metamask/keyring-api';
import { CaipAssetType, Hex, Json } from '@metamask/utils';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';

import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { addTransaction } from '../../../../util/transaction-controller';
import { signAndSendMultichainTransaction } from './multichain-snaps';
import { buildSolanaTokenSelfTransfer } from './solana-token-transfer';

export const SOLANA_TEST_AMOUNT_USDC = '0.5';

const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOLANA_USDC_DECIMALS = 6;

const SOLANA_USDC_ASSET_ID =
  `${SolScope.Mainnet}/token:${SOLANA_USDC_MINT}` as CaipAssetType;

const PAY_FLAG = 'confirmations_pay';
const PAY_EXTENDED_FLAG = 'confirmations_pay_extended';

const FINAL_STATUSES = [
  TransactionStatus.confirmed,
  TransactionStatus.dropped,
  TransactionStatus.failed,
  TransactionStatus.rejected,
];

/**
 * Create a placeholder transaction that MetaMask Pay funds by delivering the
 * test amount in Solana USDC to the Solana account, then purchase once
 * confirmed.
 *
 * The required amount starts at zero and is set by the confirmation, which
 * is prefilled with the returned amount.
 *
 * @returns The placeholder transaction ID and the human USDC amount to deposit.
 */
export async function startSolanaTest({
  evmAddress,
  networkClientId,
  solanaAccount,
}: {
  evmAddress: Hex;
  networkClientId: string;
  solanaAccount: InternalAccount;
}): Promise<{ amount: string; transactionId: string }> {
  // MetaMask Pay reads the required token's metadata and price from
  // AssetsController, which may not track Solana USDC if it was never held.
  await Engine.context.AssetsController.addCustomAsset(
    solanaAccount.id,
    SOLANA_USDC_ASSET_ID,
    {
      address: SOLANA_USDC_MINT,
      chainId: SolScope.Mainnet,
      decimals: SOLANA_USDC_DECIMALS,
      name: 'USD Coin',
      symbol: 'USDC',
    },
  );

  const { transactionMeta } = await addTransaction(
    { data: '0x', from: evmAddress, to: evmAddress, value: '0x0' },
    {
      networkClientId,
      origin: ORIGIN_METAMASK,
      requiredAssets: [
        {
          address: SOLANA_USDC_MINT,
          amount: '0x0',
          chainId: SolScope.Mainnet,
          recipient: solanaAccount.address,
          standard: 'spl',
        },
      ],
      skipInitialGasEstimate: true,
      type: TransactionType.solanaTest,
    },
  );

  purchaseOnConfirmation(transactionMeta.id, solanaAccount);

  return { amount: SOLANA_TEST_AMOUNT_USDC, transactionId: transactionMeta.id };
}

/**
 * Opt Solana test deposits into the MetaMask Pay server strategy using local
 * feature flag overrides, optionally pointing at another intents API.
 *
 * Routes Solana test deposits to the server strategy explicitly, as the remote
 * strategy order may not include it.
 *
 * @param serverBaseUrl - Optional intents API base URL, such as a local server.
 */
export function enableSolanaTestServerStrategy(serverBaseUrl?: string) {
  overrideFlag<{
    strategyOverrides?: { transactionTypes?: Record<string, Json> };
  }>(PAY_FLAG, (flags) => ({
    ...flags,
    strategyOverrides: {
      ...flags.strategyOverrides,
      transactionTypes: {
        ...flags.strategyOverrides?.transactionTypes,
        [TransactionType.solanaTest]: { default: ['server'] },
      },
    },
  }));

  overrideFlag<{ payStrategies?: { server?: Record<string, Json> } }>(
    PAY_EXTENDED_FLAG,
    (flags) => {
      const server = flags.payStrategies?.server ?? {};
      const enabledTypes = (server.enabledTransactionTypes ?? []) as string[];

      return {
        ...flags,
        payStrategies: {
          ...flags.payStrategies,
          server: {
            ...server,
            ...(serverBaseUrl ? { baseUrl: serverBaseUrl } : {}),
            enabled: true,
            enabledTransactionTypes: [
              ...new Set([...enabledTypes, TransactionType.solanaTest]),
            ],
          },
        },
      };
    },
  );
}

function overrideFlag<Flag extends Record<string, unknown>>(
  name: string,
  update: (flag: Flag) => Flag,
) {
  const { RemoteFeatureFlagController } = Engine.context;
  const flag = (RemoteFeatureFlagController.state.remoteFeatureFlags[name] ??
    {}) as Flag;

  RemoteFeatureFlagController.setFlagOverride(name, update(flag) as Json);
}

function purchaseOnConfirmation(
  transactionId: string,
  solanaAccount: InternalAccount,
) {
  const handler = ({
    transactionMeta,
  }: {
    transactionMeta: TransactionMeta;
  }) => {
    if (
      transactionMeta.id !== transactionId ||
      !FINAL_STATUSES.includes(transactionMeta.status)
    ) {
      return;
    }

    Engine.controllerMessenger.unsubscribe(
      'TransactionController:transactionStatusUpdated',
      handler,
    );

    if (transactionMeta.status === TransactionStatus.confirmed) {
      purchaseSolanaTest(solanaAccount).catch((error) =>
        Logger.error(error as Error, 'Solana test purchase failed'),
      );
    }
  };

  Engine.controllerMessenger.subscribe(
    'TransactionController:transactionStatusUpdated',
    handler,
  );
}

/**
 * Stand-in for the Solana test purchase: a transfer of the funded USDC, signed
 * and sent by the Solana snap without a second confirmation, since the user
 * already approved it in the deposit confirmation.
 */
async function purchaseSolanaTest(solanaAccount: InternalAccount) {
  const transaction = await buildSolanaTokenSelfTransfer({
    amount: new BigNumber(SOLANA_TEST_AMOUNT_USDC)
      .shiftedBy(SOLANA_USDC_DECIMALS)
      .toNumber(),
    decimals: SOLANA_USDC_DECIMALS,
    mint: SOLANA_USDC_MINT,
    owner: solanaAccount.address,
  });

  const result = await signAndSendMultichainTransaction(solanaAccount, {
    scope: SolScope.Mainnet,
    transaction,
  });

  Logger.log('Solana test purchase submitted', result);
}
