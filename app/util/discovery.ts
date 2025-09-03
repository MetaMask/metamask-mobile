import { Bip44Account } from '@metamask/account-api';
import { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';
import { MultichainAccountWallet } from '@metamask/multichain-account-service';
import Engine from '../core/Engine';

export async function discoverAndCreateAccountsFor(entropySources: EntropySourceId[]): Promise<void> {
  await Promise.all(entropySources.map(async (entropySource) => {
    const wallet = Engine.context.MultichainAccountService.getMultichainAccountWallet({ entropySource }) as MultichainAccountWallet<Bip44Account<KeyringAccount>>;

    await wallet.discoverAndCreateAccounts();
  }));
}