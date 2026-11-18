/**
 * Perps stream harness — a real `PerpsController` → `HyperLiquidProvider`
 * chain (Shape A I/O mocks from `perps.ts`) bound into Mobile's Engine, for
 * scenarios that drive `PerpsStreamManager` channels.
 *
 * Owns the app-shell mocks those channels read: Engine (the controller and
 * the selected account), the connection manager's state and the store.
 * Import it before any module that reads Engine.
 */
import type { PerpsController } from '@metamask/perps-controller';
import { buildPerpsControllerHarness } from './perps';

interface PerpsStreamBinding {
  controller: PerpsController | null;
  account: { address: string; type: string };
}

const DEFAULT_STREAM_ACCOUNT: `0x${string}` =
  '0x0000000000000000000000000000000000000abc';

const mockStreamBinding: PerpsStreamBinding = {
  controller: null,
  account: { address: DEFAULT_STREAM_ACCOUNT, type: 'eip155:eoa' },
};

jest.mock('../../../../app/core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      get PerpsController() {
        return mockStreamBinding.controller;
      },
      AccountTreeController: {
        getAccountsFromSelectedAccountGroup: () => [mockStreamBinding.account],
      },
    },
  },
}));

jest.mock(
  '../../../../app/components/UI/Perps/services/PerpsConnectionManager',
  () => {
    const connected = () => ({ isInitialized: true, isConnecting: false });
    return {
      __esModule: true,
      default: { getConnectionState: connected },
      PerpsConnectionManager: { getConnectionState: connected },
    };
  },
);

jest.mock('../../../../app/store', () => ({
  store: { getState: jest.fn(() => ({})) },
}));

export type PerpsStreamHarness = ReturnType<
  typeof buildPerpsControllerHarness
> & {
  /**
   * Selects another account, in Engine (what the stream channels check) and
   * in the wallet service (what the controller trades and streams as).
   */
  selectAccount: (address: `0x${string}`) => void;
};

/**
 * Builds and initializes a real controller, binds it into Engine and selects
 * the default account.
 */
export async function buildPerpsStreamHarness(): Promise<PerpsStreamHarness> {
  const harness = buildPerpsControllerHarness();
  const selectAccount = (address: `0x${string}`) => {
    mockStreamBinding.account = { address, type: 'eip155:eoa' };
    harness.wallet.getUserAddress.mockReturnValue(address);
    harness.wallet.getUserAddressWithDefault.mockResolvedValue(address);
  };
  selectAccount(DEFAULT_STREAM_ACCOUNT);
  mockStreamBinding.controller = harness.controller;
  await harness.controller.init();
  return { ...harness, selectAccount };
}

/** Disconnects the bound controller and unbinds it from Engine. */
export async function resetPerpsStreamHarness(): Promise<void> {
  await mockStreamBinding.controller?.disconnect();
  mockStreamBinding.controller = null;
  mockStreamBinding.account = {
    address: DEFAULT_STREAM_ACCOUNT,
    type: 'eip155:eoa',
  };
}
