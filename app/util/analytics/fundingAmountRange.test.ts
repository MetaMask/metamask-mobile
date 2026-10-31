import {
  getFundingAmountRange,
  fetchImportedWalletFundingAmountRange,
  takeImportedWalletFundingAmountRange,
  FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS,
} from './fundingAmountRange';
import Engine from '../../core/Engine';
import EngineService from '../../core/EngineService';
import { selectUnifiedBalanceBySelectedAccountGroup } from '../../selectors/assets/balances';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';
import { createMockInternalAccount } from '../test/accountsControllerTestUtils';

const mockGroupBalanceSelector = jest.fn();

jest.mock('../../core/Engine', () => ({
  context: {
    AccountTreeController: { getAccountsFromSelectedAccountGroup: jest.fn() },
    AssetsController: { getAssets: jest.fn() },
    NetworkEnablementController: {
      listPopularNetworks: jest.fn(() => ['eip155:1', 'solana:mainnet']),
    },
  },
}));

jest.mock('../../core/Assets/accountGroupAssetLoader', () => ({
  FUNGIBLE_ASSET_TYPES: ['fungible'],
}));

jest.mock('../../core/EngineService', () => ({
  flushState: jest.fn(),
}));

jest.mock('../../core/redux', () => ({
  store: { getState: jest.fn(() => ({})) },
}));

jest.mock('../Logger', () => ({ log: jest.fn(), error: jest.fn() }));

jest.mock('../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(),
}));

jest.mock('../../selectors/assets/balances', () => ({
  selectUnifiedBalanceBySelectedAccountGroup: jest.fn(
    () => mockGroupBalanceSelector,
  ),
}));

const mockGetAssets = jest.mocked(Engine.context.AssetsController.getAssets);
const mockListPopularNetworks = jest.mocked(
  Engine.context.NetworkEnablementController.listPopularNetworks,
);
const mockFlushState = jest.mocked(EngineService.flushState);
const mockGetGroupAccounts = jest.mocked(
  Engine.context.AccountTreeController.getAccountsFromSelectedAccountGroup,
);
const mockSelectBasicFunctionalityEnabled = jest.mocked(
  selectBasicFunctionalityEnabled,
);
const mockSelectUnifiedBalance = jest.mocked(
  selectUnifiedBalanceBySelectedAccountGroup,
);

const GROUP_ACCOUNTS = [
  createMockInternalAccount(
    '0x0000000000000000000000000000000000000001',
    'Account 1',
  ),
];

function arrangeGroupBalance(
  totalBalanceInUserCurrency: number,
  userCurrency = 'usd',
) {
  mockGroupBalanceSelector.mockReturnValue({
    walletId: 'keyring:wallet1',
    groupId: 'keyring:wallet1/0',
    totalBalanceInUserCurrency,
    userCurrency,
  });
}

describe('getFundingAmountRange', () => {
  it.each([
    [0, '< 0.01'],
    [-1, '< 0.01'],
    [0.009, '< 0.01'],
    [0.01, '0.01 - 9.99'],
    [9.99, '0.01 - 9.99'],
    [10, '10.00 - 99.99'],
    [99.99, '10.00 - 99.99'],
    [100, '100.00 - 999.99'],
    [999.99, '100.00 - 999.99'],
    [1000, '1000.00 - 9999.99'],
    [9999.99, '1000.00 - 9999.99'],
    [10000, '10000.00+'],
    [1000000, '10000.00+'],
  ])('buckets %s into %s', (amount, expectedRange) => {
    expect(getFundingAmountRange(amount as number)).toBe(expectedRange);
  });
});

describe('fetchImportedWalletFundingAmountRange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    takeImportedWalletFundingAmountRange();
    mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
    mockGetGroupAccounts.mockReturnValue(GROUP_ACCOUNTS);
    mockGetAssets.mockResolvedValue({});
    arrangeGroupBalance(250);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('force-fetches the selected group on popular networks and buckets the USD total', async () => {
    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBe('100.00 - 999.99');
    expect(mockGetAssets).toHaveBeenCalledWith(GROUP_ACCOUNTS, {
      chainIds: ['eip155:1', 'solana:mainnet'],
      assetTypes: ['fungible'],
      forceUpdate: true,
    });
    expect(mockSelectUnifiedBalance).toHaveBeenCalledWith([
      'eip155:1',
      'solana:mainnet',
    ]);
  });

  it('flushes controller state into Redux before reading the balance', async () => {
    await fetchImportedWalletFundingAmountRange();

    expect(mockFlushState.mock.invocationCallOrder[0]).toBeLessThan(
      mockGroupBalanceSelector.mock.invocationCallOrder[0],
    );
  });

  it("resolves '< 0.01' for a zero balance after a successful fetch", async () => {
    arrangeGroupBalance(0);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBe('< 0.01');
  });

  it('resolves undefined without fetching when the selected group has no accounts', async () => {
    mockGetGroupAccounts.mockReturnValue([]);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
    expect(mockGetAssets).not.toHaveBeenCalled();
  });

  it('resolves undefined without fetching when Basic Functionality is off', async () => {
    mockSelectBasicFunctionalityEnabled.mockReturnValue(false);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
    expect(mockGetAssets).not.toHaveBeenCalled();
  });

  it('resolves undefined without fetching when there are no popular networks', async () => {
    mockListPopularNetworks.mockReturnValueOnce([]);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
    expect(mockGetAssets).not.toHaveBeenCalled();
  });

  it('resolves undefined when the fetch rejects', async () => {
    mockGetAssets.mockRejectedValue(new Error('network down'));

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
    expect(mockGroupBalanceSelector).not.toHaveBeenCalled();
  });

  it('resolves undefined when the fetch outlives the timeout', async () => {
    jest.useFakeTimers();
    mockGetAssets.mockReturnValue(new Promise(() => undefined));

    const rangePromise = fetchImportedWalletFundingAmountRange();
    jest.advanceTimersByTime(FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS);

    expect(await rangePromise).toBeUndefined();
    expect(mockGroupBalanceSelector).not.toHaveBeenCalled();
  });

  it('resolves undefined when the balance is not in USD', async () => {
    arrangeGroupBalance(250, 'eur');

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
  });

  it('resolves undefined when no group balance is available', async () => {
    mockGroupBalanceSelector.mockReturnValue(null);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
  });
});

describe('takeImportedWalletFundingAmountRange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    takeImportedWalletFundingAmountRange();
    mockGetGroupAccounts.mockReturnValue([]);
  });

  it('returns the pending fetch once, then undefined', () => {
    const fetchPromise = fetchImportedWalletFundingAmountRange();

    expect(takeImportedWalletFundingAmountRange()).toBe(fetchPromise);
    expect(takeImportedWalletFundingAmountRange()).toBeUndefined();
  });

  it('returns undefined when no fetch was started', () => {
    expect(takeImportedWalletFundingAmountRange()).toBeUndefined();
  });
});
