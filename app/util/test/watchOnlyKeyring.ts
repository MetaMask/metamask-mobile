import { KeyringType } from '@metamask/keyring-api/v2';
import Engine from '../../core/Engine';

/** The account the component-view presets select. */
const SELECTED_ADDRESS = '0x0000000000000000000000000000000000000001';

export const addWatchOnlyKeyring = (address = SELECTED_ADDRESS) =>
  Engine.context.KeyringController.state.keyrings.push({
    type: KeyringType.WatchOnly,
    accounts: [address],
    metadata: { id: 'watch-only', name: '' },
  });

/** Drops only the watch-only keyrings, keeping any other test setup. */
export const removeWatchOnlyKeyring = () => {
  const { keyrings } = Engine.context.KeyringController.state;
  for (let i = keyrings.length - 1; i >= 0; i--) {
    if (keyrings[i].type === KeyringType.WatchOnly) {
      keyrings.splice(i, 1);
    }
  }
};

/** Holds `address` on a watch-only keyring for each test in the block. */
export function withWatchOnlyKeyring(address?: string) {
  beforeEach(() => addWatchOnlyKeyring(address));
  afterEach(removeWatchOnlyKeyring);
}
