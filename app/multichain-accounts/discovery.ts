import { Bip44Account } from '@metamask/account-api';
import { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';
import { MultichainAccountWallet } from '@metamask/multichain-account-service';
import Engine from '../core/Engine';

export async function discoverAndCreateAccounts(
  entropySource: EntropySourceId,
): Promise<number> {
  // HACK: Force Snap keyring instantiation.
  await Engine.getSnapKeyring();

  const wallet =
    Engine.context.MultichainAccountService.getMultichainAccountWallet({
      entropySource,
    }) as MultichainAccountWallet<Bip44Account<KeyringAccount>>;

  const result = await wallet.discoverAndCreateAccounts();

  // Compute the number of discovered accounts accross all account providers.
  return Object.values(result).reduce((acc, discovered) => acc + discovered, 0);
}
