import { discoverAccounts } from './discovery';
import { endTrace, trace, TraceName, TraceOperation } from '../util/trace';

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

jest.mock('../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: { DiscoverAccounts: 'Discover Accounts' },
  TraceOperation: { AccountDiscover: 'account.discover' },
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);

const mockEntropySource = 'mock-entropy-source';

describe('discoverAccounts', () => {
  beforeEach(() => {
    mockDiscoverAccounts.mockReset();
    mockTrace.mockClear();
    mockEndTrace.mockClear();
  });

  it('ensures account syncing is triggered at least once before discovery', async () => {
    mockDiscoverAccounts.mockResolvedValue([]); // Nothing got discovered.

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

  it('emits a backdated trace only when accounts were discovered', async () => {
    const discoveredAccounts = 3;
    mockDiscoverAccounts.mockResolvedValue(
      Array.from({ length: discoveredAccounts }),
    );

    await discoverAccounts(mockEntropySource);

    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TraceName.DiscoverAccounts,
        op: TraceOperation.AccountDiscover,
        startTime: expect.any(Number),
      }),
    );
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.DiscoverAccounts,
      data: { discovered: discoveredAccounts },
    });
  });

  it('does not emit a trace when nothing was discovered', async () => {
    mockDiscoverAccounts.mockResolvedValue([]);

    await discoverAccounts(mockEntropySource);

    expect(mockTrace).not.toHaveBeenCalled();
    expect(mockEndTrace).not.toHaveBeenCalled();
  });
});
