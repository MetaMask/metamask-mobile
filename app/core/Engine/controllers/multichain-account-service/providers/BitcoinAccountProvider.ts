import { assertIsBip44Account, type Bip44Account } from '@metamask/account-api';
import {
  EntropySourceId,
  KeyringAccount,
  BtcAccountType,
  BtcScope,
} from '@metamask/keyring-api';

import { KeyringTypes } from '@metamask/keyring-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { KeyringClient } from '@metamask/keyring-snap-client';
import {
  MultichainAccountServiceMessenger,
  SnapAccountProvider,
} from '@metamask/multichain-account-service';
import { withTimeout } from '@metamask/snaps-controllers';
import type { SnapId } from '@metamask/snaps-sdk';
import { HandlerType } from '@metamask/snaps-utils';
import type { Json, JsonRpcRequest } from '@metamask/utils';

export interface BitcoinAccountProviderConfig {
  discovery: {
    maxAttempts: number;
    timeoutMs: number;
    backOffMs: number;
  };
}

/**
 * Execute a function with exponential backoff on transient failures.
 *
 * @param fnToExecute - The function to execute.
 * @param options - The options for the retry.
 * @param options.maxAttempts - The maximum number of attempts.
 * @param options.backOffMs - The backoff in milliseconds.
 * @throws An error if the transaction count cannot be retrieved.
 * @returns The result of the function.
 */
export async function withRetry<T>(
  fnToExecute: () => Promise<T>,
  {
    maxAttempts = 3,
    backOffMs = 500,
  }: { maxAttempts?: number; backOffMs?: number } = {},
): Promise<T> {
  let lastError;
  let backOff = backOffMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fnToExecute();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        break;
      }
      const delay = backOff;
      await new Promise((resolve) => setTimeout(resolve, delay));
      backOff *= 2;
    }
  }
  throw lastError;
}

export const BITCOIN_ACCOUNT_PROVIDER_NAME = 'Bitcoin' as const;

export class BitcoinAccountProvider extends SnapAccountProvider {
  static NAME = BITCOIN_ACCOUNT_PROVIDER_NAME;

  static BITCOIN_SNAP_ID = 'npm:@metamask/bitcoin-wallet-snap' as SnapId;

  readonly #client: KeyringClient;

  readonly #config: BitcoinAccountProviderConfig;

  constructor(
    messenger: MultichainAccountServiceMessenger,
    config: BitcoinAccountProviderConfig = {
      discovery: {
        timeoutMs: 2000,
        maxAttempts: 3,
        backOffMs: 1000,
      },
    },
  ) {
    super(BitcoinAccountProvider.BITCOIN_SNAP_ID, messenger);
    this.#client = this.#getKeyringClientFromSnapId(
      BitcoinAccountProvider.BITCOIN_SNAP_ID,
    );
    this.#config = config;
  }

  getName(): string {
    return BitcoinAccountProvider.NAME;
  }

  #getKeyringClientFromSnapId(snapId: string): KeyringClient {
    return new KeyringClient({
      send: async (request: JsonRpcRequest) => {
        const response = await this.messenger.call(
          'SnapController:handleRequest',
          {
            snapId: snapId as SnapId,
            origin: 'metamask',
            handler: HandlerType.OnKeyringRequest,
            request,
          },
        );
        return response as Json;
      },
    });
  }

  isAccountCompatible(account: Bip44Account<InternalAccount>): boolean {
    return (
      account.metadata.keyring.type === KeyringTypes.snap &&
      Object.values<string>(BtcAccountType).includes(account.type)
    );
  }

  async createAccounts({
    entropySource,
    groupIndex: index,
  }: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }): Promise<Bip44Account<KeyringAccount>[]> {
    const createAccount = await this.getRestrictedSnapAccountCreator();

    const createBitcoinAccount = async (addressType: BtcAccountType) =>
      await createAccount({
        entropySource,
        index,
        addressType,
        scope: BtcScope.Mainnet,
      });

    const [p2wpkh, p2tr] = await Promise.all([
      createBitcoinAccount(BtcAccountType.P2wpkh),
      createBitcoinAccount(BtcAccountType.P2tr),
    ]);

    assertIsBip44Account(p2wpkh);
    assertIsBip44Account(p2tr);

    return [p2wpkh, p2tr];
  }

  async discoverAccounts({
    entropySource,
    groupIndex,
  }: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) {
    const discoveredAccounts = await withRetry(
      () =>
        withTimeout(
          this.#client.discoverAccounts(
            [BtcScope.Mainnet],
            entropySource,
            groupIndex,
          ),
          this.#config.discovery.timeoutMs,
        ),
      {
        maxAttempts: this.#config.discovery.maxAttempts,
        backOffMs: this.#config.discovery.backOffMs,
      },
    );

    if (!Array.isArray(discoveredAccounts) || discoveredAccounts.length === 0) {
      return [];
    }

    const createdAccounts = await this.createAccounts({
      entropySource,
      groupIndex,
    });

    return createdAccounts;
  }
}
