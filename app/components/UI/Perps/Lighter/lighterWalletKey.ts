import type { Hex } from '@metamask/utils';
import type { LighterCreateClientParams } from '@metamask/perps-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import { assertLighterClientParameters } from './lighterRegistration';

interface AppKeyring {
  type: string;
  exportAccount?: (
    address: Hex,
    options: { withAppKeyOrigin: string },
  ) => Promise<string>;
}

/**
 * Recreate a trading seed through the software keyring's app-key derivation.
 * The fixed internal origin separates this seed from the Ethereum signing key.
 * Slots and nonces are deliberately excluded so restored devices can find an
 * existing registration. Only the two audited software keyrings support this
 * contract. Hardware/Snap keyrings retain their locally persisted signer keys.
 */
export async function deriveLighterWalletKey(
  keyring: AppKeyring,
  address: Hex,
  params: LighterCreateClientParams,
): Promise<string | null> {
  assertLighterClientParameters(params);
  if (
    keyring.type !== KeyringTypes.hd &&
    keyring.type !== KeyringTypes.simple
  ) {
    return null;
  }
  if (!keyring.exportAccount) {
    throw new Error('Lighter wallet key derivation is unavailable');
  }
  const origin = `metamask-internal://perps/lighter/trading-key/v1/${params.chainId}/${params.accountIndex}`;
  const derived = await keyring.exportAccount(address, {
    withAppKeyOrigin: origin,
  });
  if (!/^[0-9a-f]{64}$/u.test(derived)) {
    throw new Error('Lighter wallet key derivation returned an invalid seed');
  }
  return derived;
}
