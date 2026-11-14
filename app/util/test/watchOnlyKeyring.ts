import Engine from '../../core/Engine';

/** The account the component-view presets select. */
const SELECTED_ADDRESS = '0x0000000000000000000000000000000000000001';

export const addWatchOnlyKeyring = (address = SELECTED_ADDRESS) =>
  Engine.context.KeyringController.state.keyrings.push({
    type: 'watch-only',
    accounts: [address],
    metadata: { id: 'watch-only', name: '' },
  });

/** Holds `address` on a watch-only keyring for each test in the block. */
export function withWatchOnlyKeyring(address?: string) {
  beforeEach(() => addWatchOnlyKeyring(address));
  afterEach(() => Engine.context.KeyringController.state.keyrings.pop());
}
