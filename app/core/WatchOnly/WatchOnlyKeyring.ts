import { KeyringTypes } from '@metamask/keyring-controller';
import type { Keyring } from '@metamask/keyring-utils';
import { add0x, type Hex, type Json } from '@metamask/utils';

interface WatchOnlyKeyringState {
  addresses: Hex[];
}

/**
 * Key-less keyring holding addresses that can be selected and read but never
 * signed for. It deliberately implements no `sign*` method, so
 * KeyringController rejects every signing request for its accounts.
 */
export class WatchOnlyKeyring implements Keyring {
  // Uses the deprecated V1 `KeyringTypes` enum because this keyring has no V2
  // builder yet.
  // TODO: Switch to `KeyringType.WatchOnly` from `@metamask/keyring-api/v2`
  // (MetaMask/accounts) once the keyring is accepted and moved there.
  static type = KeyringTypes.watchOnly;

  type = WatchOnlyKeyring.type;

  #addresses: Hex[] = [];

  async serialize(): Promise<Json> {
    return { addresses: [...this.#addresses] };
  }

  async deserialize(state: Json): Promise<void> {
    const { addresses = [] } = (state ?? {}) as Partial<WatchOnlyKeyringState>;
    this.#addresses = addresses.map((address) => add0x(address.toLowerCase()));
  }

  async getAccounts(): Promise<Hex[]> {
    return [...this.#addresses];
  }

  async addAccounts(): Promise<Hex[]> {
    throw new Error('WatchOnlyKeyring cannot derive accounts');
  }

  removeAccount(address: Hex): void {
    const normalized = add0x(address.toLowerCase());
    if (!this.#addresses.includes(normalized)) {
      throw new Error(`Address ${address} not found in WatchOnlyKeyring`);
    }
    this.#addresses = this.#addresses.filter((item) => item !== normalized);
  }
}
