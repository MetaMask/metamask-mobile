///: BEGIN:ONLY_INCLUDE_IF(stellar)
import type { Bip44Account } from '@metamask/account-api';
import {
  AccountCreationType,
  XlmAccountType,
  XlmScope,
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

interface SnapKeyring {
  createAccount: (options: Record<string, Json>) => Promise<KeyringAccount>;
}

type SnapAccountProviderConfig = ConstructorParameters<
  typeof SnapAccountProvider
>[2];

export class XlmAccountProvider extends SnapAccountProvider {
  static readonly NAME = 'Stellar';

  readonly capabilities: KeyringCapabilities;

  constructor(
    messenger: MultichainAccountServiceMessenger,
    config: SnapAccountProviderConfig,
  ) {
    super(STELLAR_WALLET_SNAP_ID as SnapId, messenger, config);
    this.capabilities = {
      scopes: [XlmScope.Pubnet, XlmScope.Testnet],
      bip44: { deriveIndex: true, deriveIndexRange: true },
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
    keyring: SnapKeyring,
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
    if (!this.config.discovery.enabled) {
      return [];
    }

    return this.withSnap(async ({ client, keyring }) => {
      const { timeoutMs, maxAttempts, backOffMs } = this.config.discovery;
      let discoveredAccounts: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          discoveredAccounts = await Promise.race([
            client.discoverAccounts(
              [XlmScope.Pubnet],
              entropySource,
              groupIndex,
            ),
            new Promise<never>((_, reject) => {
              setTimeout(
                () => reject(new Error(`Timed out after ${timeoutMs}ms`)),
                timeoutMs,
              );
            }),
          ]);
          break;
        } catch {
          if (attempt === maxAttempts) {
            return [];
          }
          await new Promise((resolve) => setTimeout(resolve, backOffMs));
        }
      }

      if (
        !Array.isArray(discoveredAccounts) ||
        discoveredAccounts.length === 0
      ) {
        return [];
      }

      return this.createBip44Accounts(keyring, {
        type: AccountCreationType.Bip44DeriveIndex,
        entropySource,
        groupIndex,
      });
    });
  }
}
///: END:ONLY_INCLUDE_IF
