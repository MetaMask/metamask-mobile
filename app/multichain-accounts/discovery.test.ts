import { discoverAndCreateAccounts } from './discovery';

const mockGetSnapKeyring = jest.fn();

const mockDiscoverAndCreateAccounts = jest.fn();

jest.mock('../core/Engine', () => ({
  getSnapKeyring: jest.fn().mockImplementation(() => mockGetSnapKeyring()),
  context: {
    MultichainAccountService: {
      getMultichainAccountWallet: () => ({
          discoverAndCreateAccounts: jest
            .fn()
            .mockImplementation((...args) =>
              mockDiscoverAndCreateAccounts(...args),
            ),
        }),
    },
  },
}));

const mockEntropySource = 'mock-entropy-source';

describe('discoverAndCreateAccounts', () => {
  beforeEach(() => {
    mockGetSnapKeyring.mockReset();
    mockDiscoverAndCreateAccounts.mockReset();
  });

  it('force-init the Snap keyring before discovering anything', async () => {
    mockDiscoverAndCreateAccounts.mockResolvedValue({}); // Nothing got discovered.

    await discoverAndCreateAccounts(mockEntropySource);

    // Required by the service discovery. The Snap keyring is used to create
    // non-EVM accounts, it has to be ready beforehand.
    expect(mockGetSnapKeyring).toHaveBeenCalled();
  });

  it('discovers and compute metrics from the discovery result', async () => {
    const discoveredEvmAccounts = 5;
    const discoveredSolAccounts = 3;
    mockDiscoverAndCreateAccounts.mockResolvedValue({
      EVM: discoveredEvmAccounts,
      Solana: discoveredSolAccounts,
    });

    const result = await discoverAndCreateAccounts(mockEntropySource);
    expect(result).toBe(discoveredEvmAccounts + discoveredSolAccounts);

    expect(mockDiscoverAndCreateAccounts).toHaveBeenCalled();
  });
});
