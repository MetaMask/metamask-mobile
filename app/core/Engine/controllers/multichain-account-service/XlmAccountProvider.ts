import type { Bip44Account } from '@metamask/account-api';
import {
  AccountCreationType,
  XlmAccountType,
  XlmScope,
  type CreateAccountOptions,
  type EntropySourceId,
  type KeyringAccount,
} from '@metamask/keyring-api';
import type { KeyringCapabilities } from '@metamask/keyring-api/v2';
import { KeyringTypes } from '@metamask/keyring-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  SnapAccountProvider,
  type MultichainAccountServiceMessenger,
} from '@metamask/multichain-account-service';
import type { Json, SnapId } from '@metamask/snaps-sdk';
import { STELLAR_WALLET_SNAP_ID } from '../../../SnapKeyring/StellarWalletSnap';

export const XLM_ACCOUNT_PROVIDER_NAME = 'Stellar';

interface RestrictedSnapKeyring {
  createAccount: (options: Record<string, Json>) => Promise<KeyringAccount>;
  createAccounts: (options: CreateAccountOptions) => Promise<KeyringAccount[]>;
  removeAccount: (address: string) => Promise<void>;
}

interface SnapAccountProviderConfig {
  maxConcurrency?: number;
  discovery: {
    enabled?: boolean;
    maxAttempts: number;
    timeoutMs: number;
    backOffMs: number;
  };
  createAccounts: {
    batched: boolean;
    timeoutMs: number;
  };
  resyncAccounts?: {
    autoRemoveExtraSnapAccounts?: boolean;
  };
}

const SNAP_DISCOVER_ACCOUNTS_TRACE_NAME = 'Snap Discover Accounts';

async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function withRetry<T>(
  fnToExecute: () => Promise<T>,
  {
    maxAttempts,
    backOffMs,
  }: {
    maxAttempts: number;
    backOffMs: number;
  },
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fnToExecute();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => {
          setTimeout(resolve, backOffMs);
        });
      }
    }
  }

  throw lastError;
}

export class XlmAccountProvider extends SnapAccountProvider {
  static readonly NAME = XLM_ACCOUNT_PROVIDER_NAME;

  readonly capabilities: KeyringCapabilities;

  constructor(
    messenger: MultichainAccountServiceMessenger,
    config: SnapAccountProviderConfig,
  ) {
    super(STELLAR_WALLET_SNAP_ID as SnapId, messenger, config);
    this.capabilities = {
      scopes: [XlmScope.Pubnet, XlmScope.Testnet],
      bip44: {
        deriveIndex: true,
        deriveIndexRange: true,
      },
    };
  }

  getName(): string {
    return XlmAccountProvider.NAME;
  }

  isAccountCompatible(account: Bip44Account<InternalAccount>): boolean {
    return (
      account.type === XlmAccountType.Account &&
      account.metadata.keyring.type === KeyringTypes.snap
    );
  }

  protected createAccountV1(
    keyring: RestrictedSnapKeyring,
    {
      entropySource,
      groupIndex,
    }: {
      entropySource: EntropySourceId;
      groupIndex: number;
    },
  ): Promise<KeyringAccount> {
    return keyring.createAccount({
      entropySource,
      index: groupIndex,
      addressType: XlmAccountType.Account,
      scope: XlmScope.Pubnet,
    });
  }

  async discoverAccounts({
    entropySource,
    groupIndex,
  }: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }): Promise<Bip44Account<KeyringAccount>[]> {
    return this.withSnap(async ({ client, keyring }) =>
      this.trace(
        {
          name: SNAP_DISCOVER_ACCOUNTS_TRACE_NAME,
          data: {
            provider: this.getName(),
          },
        },
        async () => {
          if (!this.config.discovery.enabled) {
            return [];
          }

          const discoveredAccounts = await withRetry(
            () =>
              withTimeout(
                () =>
                  client.discoverAccounts(
                    [XlmScope.Pubnet],
                    entropySource,
                    groupIndex,
                  ),
                this.config.discovery.timeoutMs,
              ),
            {
              maxAttempts: this.config.discovery.maxAttempts,
              backOffMs: this.config.discovery.backOffMs,
            },
          );

          if (!discoveredAccounts.length) {
            return [];
          }

          return this.createBip44Accounts(keyring, {
            type: AccountCreationType.Bip44DeriveIndex,
            entropySource,
            groupIndex,
          });
        },
      ),
    );
  }
}
