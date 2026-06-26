import { discoverAccounts } from './discovery';

const mockDiscoverAccounts = jest.fn();
const mockSyncWithUserStorageAtLeastOnce = jest.fn();

jest.mock('../core/Engine', () => ({
  context: {
    AccountTreeController: {
      syncWithUserStorageAtLeastOnce: jest
        .fn()
        .mockImplementation(() => mockSyncWithUserStorageAtLeastOnce()),
    },
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
    mockDiscoverAccounts.mockReset();
  });

  it('ensures account syncing is triggered at least once before discovery', async () => {
    mockDiscoverAccounts.mockResolvedValue({}); // Nothing got discovered.

    await discoverAccounts(mockEntropySource);

    expect(mockSyncWithUserStorageAtLeastOnce).toHaveBeenCalled();
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
