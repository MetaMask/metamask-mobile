import type { Bip44Account } from '@metamask/account-api';
import {
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

  discoverAccounts(): Promise<Bip44Account<KeyringAccount>[]> {
    return Promise.resolve([]);
  }
}
