import { discoverAccounts } from './discovery';

const mockGetSnapKeyring = jest.fn();

const mockDiscoverAccounts = jest.fn();

jest.mock('../core/Engine', () => ({
  getSnapKeyring: jest.fn().mockImplementation(() => mockGetSnapKeyring()),
  context: {
    MultichainAccountService: {
      getMultichainAccountWallet: () => ({
        discoverAccounts: jest
          .fn()
          .mockImplementation((...args) => mockDiscoverAccounts(...args)),
      }),
    },
  },
}));

const mockEntropySource = 'mock-entropy-source';

describe('discoverAccounts', () => {
  beforeEach(() => {
    mockGetSnapKeyring.mockReset();
    mockDiscoverAccounts.mockReset();
  });

  it('force-init the Snap keyring before discovering anything', async () => {
    mockDiscoverAccounts.mockResolvedValue({}); // Nothing got discovered.

    await discoverAccounts(mockEntropySource);

    // Required by the service discovery. The Snap keyring is used to create
    // non-EVM accounts, it has to be ready beforehand.
    expect(mockGetSnapKeyring).toHaveBeenCalled();
  });

  it('discovers and compute metrics from the discovery result', async () => {
    const discoveredAccounts = 8;
    mockDiscoverAccounts.mockResolvedValue(
      Array.from({ length: discoveredAccounts }),
    );

    const result = await discoverAccounts(mockEntropySource);
    expect(result).toBe(discoveredAccounts);

    expect(mockDiscoverAccounts).toHaveBeenCalled();
  });
});
