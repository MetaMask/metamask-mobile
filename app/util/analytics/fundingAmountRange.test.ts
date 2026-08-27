import {
  getFundingAmountRange,
  fetchImportedWalletFundingAmountRange,
  FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS,
} from './fundingAmountRange';
import Engine from '../../core/Engine';
import ReduxService from '../../core/redux';
import { selectSelectedAccountGroupInternalAccounts } from '../../selectors/multichainAccounts/accountTreeController';
import { selectBalanceBySelectedAccountGroup } from '../../selectors/assets/balances';
import { selectIsAssetsUnifyStateEnabled } from '../../selectors/featureFlagController/assetsUnifyState';

jest.mock('../../core/Engine', () => ({
  context: {
    AccountTrackerController: { refresh: jest.fn() },
    CurrencyRateController: { updateExchangeRate: jest.fn() },
    MultichainAssetsRatesController: { updateAssetsRates: jest.fn() },
    MultichainBalancesController: { updateBalance: jest.fn() },
    NetworkEnablementController: {
      listPopularEvmNetworks: jest.fn(() => ['0x1']),
      listPopularNetworks: jest.fn(() => ['eip155:1']),
    },
    TokenBalancesController: { _executePoll: jest.fn() },
    TokenDetectionController: { detectTokens: jest.fn() },
    TokenRatesController: { _executePoll: jest.fn() },
  },
}));

jest.mock('../../core/redux', () => ({
  store: { getState: jest.fn(() => ({})) },
}));

jest.mock('../Logger', () => ({ log: jest.fn(), error: jest.fn() }));

jest.mock('../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({
    '0x1': {
      defaultRpcEndpointIndex: 0,
      rpcEndpoints: [{ networkClientId: 'mainnet' }],
    },
  })),
  selectNativeNetworkCurrencies: jest.fn(() => ['ETH']),
}));

jest.mock('../../selectors/multichainAccounts/accountTreeController', () => ({
  selectSelectedAccountGroupInternalAccounts: jest.fn(() => []),
}));

jest.mock('../../selectors/assets/balances', () => ({
  selectBalanceBySelectedAccountGroup: jest.fn(),
}));

jest.mock('../../selectors/featureFlagController/assetsUnifyState', () => ({
  selectIsAssetsUnifyStateEnabled: jest.fn(() => false),
}));

const mockSelectSelectedAccountGroupInternalAccounts =
  selectSelectedAccountGroupInternalAccounts as unknown as jest.Mock;
const mockSelectBalanceBySelectedAccountGroup =
  selectBalanceBySelectedAccountGroup as unknown as jest.Mock;
const mockSelectIsAssetsUnifyStateEnabled =
  selectIsAssetsUnifyStateEnabled as unknown as jest.Mock;

const mockEngineContext = Engine.context as unknown as {
  AccountTrackerController: { refresh: jest.Mock };
  CurrencyRateController: { updateExchangeRate: jest.Mock };
  MultichainAssetsRatesController: { updateAssetsRates: jest.Mock };
  MultichainBalancesController: { updateBalance: jest.Mock };
  NetworkEnablementController: {
    listPopularEvmNetworks: jest.Mock;
    listPopularNetworks: jest.Mock;
  };
  TokenBalancesController: { _executePoll: jest.Mock };
  TokenDetectionController: { detectTokens: jest.Mock };
  TokenRatesController: { _executePoll: jest.Mock };
};

const GROUP_ID = 'keyring:wallet1/0';

function arrangeSuccessfulRefresh(totalBalanceInUserCurrency: number) {
  mockEngineContext.AccountTrackerController.refresh.mockResolvedValue(
    undefined,
  );
  mockEngineContext.CurrencyRateController.updateExchangeRate.mockResolvedValue(
    undefined,
  );
  mockEngineContext.TokenBalancesController._executePoll.mockResolvedValue(
    undefined,
  );
  mockEngineContext.TokenDetectionController.detectTokens.mockResolvedValue(
    undefined,
  );
  mockEngineContext.MultichainBalancesController.updateBalance.mockResolvedValue(
    undefined,
  );
  mockEngineContext.MultichainAssetsRatesController.updateAssetsRates.mockResolvedValue(
    undefined,
  );
  mockEngineContext.TokenRatesController._executePoll.mockResolvedValue(
    undefined,
  );
  mockSelectSelectedAccountGroupInternalAccounts.mockReturnValue([]);
  mockSelectBalanceBySelectedAccountGroup.mockReturnValue(() => ({
    walletId: 'keyring:wallet1',
    groupId: GROUP_ID,
    totalBalanceInUserCurrency,
    userCurrency: 'usd',
  }));
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
    (ReduxService.store.getState as jest.Mock).mockReturnValue({});
  });

  it('returns the range of the selected account group balance after a successful refresh', async () => {
    arrangeSuccessfulRefresh(50);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBe('10.00 - 99.99');
    expect(
      mockEngineContext.AccountTrackerController.refresh,
    ).toHaveBeenCalledWith(['mainnet']);
    expect(
      mockEngineContext.TokenBalancesController._executePoll,
    ).toHaveBeenCalledWith({ chainIds: ['0x1'] });
    expect(
      mockEngineContext.TokenRatesController._executePoll,
    ).toHaveBeenCalledWith({ chainIds: ['0x1'] });
    expect(mockSelectBalanceBySelectedAccountGroup).toHaveBeenCalledWith([
      'eip155:1',
    ]);
  });

  it('fetches token rates only after detection and the balance poll settle', async () => {
    arrangeSuccessfulRefresh(50);
    // Hold detection open: the rates poll prices the token set in state at
    // call time, so it must not start until detection has registered tokens.
    let resolveDetection: () => void = () => undefined;
    mockEngineContext.TokenDetectionController.detectTokens.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDetection = resolve;
      }),
    );

    const rangePromise = fetchImportedWalletFundingAmountRange();
    await Promise.resolve();
    await Promise.resolve();
    expect(
      mockEngineContext.TokenRatesController._executePoll,
    ).not.toHaveBeenCalled();

    resolveDetection();
    const range = await rangePromise;

    expect(range).toBe('10.00 - 99.99');
    expect(
      mockEngineContext.TokenRatesController._executePoll,
    ).toHaveBeenCalledWith({ chainIds: ['0x1'] });
  });

  it('returns < 0.01 for a confirmed zero balance', async () => {
    arrangeSuccessfulRefresh(0);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBe('< 0.01');
  });

  it('returns undefined when a refresh task fails', async () => {
    arrangeSuccessfulRefresh(50);
    mockEngineContext.AccountTrackerController.refresh.mockRejectedValue(
      new Error('network down'),
    );

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
    expect(
      mockEngineContext.AccountTrackerController.refresh,
    ).toHaveBeenCalledTimes(1);
  });

  it('tolerates an Invalid chain ID failure for a chain outside the request', async () => {
    arrangeSuccessfulRefresh(50);
    // Accounts-API rows for backend-supported-but-unconfigured chains (Sei)
    // make the final register-untracked-tokens step throw.
    mockEngineContext.TokenBalancesController._executePoll.mockRejectedValue(
      new Error('Invalid chain ID "0x531"'),
    );

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBe('10.00 - 99.99');
    expect(
      mockEngineContext.TokenBalancesController._executePoll,
    ).toHaveBeenCalledTimes(1);
  });

  it('stays fatal when Invalid chain ID names a requested chain', async () => {
    arrangeSuccessfulRefresh(50);
    mockEngineContext.TokenBalancesController._executePoll.mockRejectedValue(
      new Error('Invalid chain ID "0x1"'),
    );

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
  });

  it('returns undefined when the refresh exceeds the timeout', async () => {
    jest.useFakeTimers();
    arrangeSuccessfulRefresh(50);
    mockEngineContext.AccountTrackerController.refresh.mockReturnValue(
      new Promise(() => {
        // never resolves
      }),
    );

    const rangePromise = fetchImportedWalletFundingAmountRange();
    await jest.advanceTimersByTimeAsync(
      FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS,
    );
    const range = await rangePromise;

    expect(range).toBeUndefined();
    jest.useRealTimers();
  });

  it('refreshes non-EVM balances and rates for the selected group after the EVM phase', async () => {
    arrangeSuccessfulRefresh(50);
    mockSelectSelectedAccountGroupInternalAccounts.mockReturnValue([
      { id: 'evm-account', type: 'eip155:eoa' },
      { id: 'solana-account', type: 'solana:data-account' },
    ]);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBe('10.00 - 99.99');
    expect(
      mockEngineContext.MultichainBalancesController.updateBalance,
    ).toHaveBeenCalledTimes(1);
    expect(
      mockEngineContext.MultichainBalancesController.updateBalance,
    ).toHaveBeenCalledWith('solana-account');
    expect(
      mockEngineContext.MultichainAssetsRatesController.updateAssetsRates,
    ).toHaveBeenCalled();
  });

  it('skips non-EVM refresh when the selected group has no non-EVM accounts', async () => {
    arrangeSuccessfulRefresh(50);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBe('10.00 - 99.99');
    expect(
      mockEngineContext.MultichainBalancesController.updateBalance,
    ).not.toHaveBeenCalled();
    expect(
      mockEngineContext.MultichainAssetsRatesController.updateAssetsRates,
    ).not.toHaveBeenCalled();
  });

  it('returns undefined when a non-EVM balance refresh fails', async () => {
    arrangeSuccessfulRefresh(50);
    mockSelectSelectedAccountGroupInternalAccounts.mockReturnValue([
      { id: 'solana-account', type: 'solana:data-account' },
    ]);
    mockEngineContext.MultichainBalancesController.updateBalance.mockRejectedValue(
      new Error('snap unavailable'),
    );

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
  });

  it('excludes popular networks that have no NetworkController configuration', async () => {
    arrangeSuccessfulRefresh(50);
    // Sei (0x531) can be enabled in NetworkEnablementController without a
    // NetworkController configuration; passing it to the balance/detection
    // refreshes throws `Invalid chain ID "0x531"` and drops the range.
    mockEngineContext.NetworkEnablementController.listPopularEvmNetworks.mockReturnValueOnce(
      ['0x1', '0x531'],
    );

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBe('10.00 - 99.99');
    expect(
      mockEngineContext.TokenBalancesController._executePoll,
    ).toHaveBeenCalledWith({ chainIds: ['0x1'] });
    expect(
      mockEngineContext.TokenDetectionController.detectTokens,
    ).toHaveBeenCalledWith({ chainIds: ['0x1'] });
    expect(
      mockEngineContext.AccountTrackerController.refresh,
    ).toHaveBeenCalledWith(['mainnet']);
  });

  it('returns undefined without refreshing when no popular EVM networks are configured', async () => {
    arrangeSuccessfulRefresh(50);
    mockEngineContext.NetworkEnablementController.listPopularEvmNetworks.mockReturnValueOnce(
      [],
    );

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
    expect(
      mockEngineContext.AccountTrackerController.refresh,
    ).not.toHaveBeenCalled();
  });

  it('omits the range without refreshing when assetsUnifyState is enabled', async () => {
    arrangeSuccessfulRefresh(50);
    // Under the unified-assets flag the legacy balance controllers this
    // fetch refreshes are deactivated; reading their empty state would
    // misreport a funded wallet as a confirmed zero.
    mockSelectIsAssetsUnifyStateEnabled.mockReturnValueOnce(true);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
    expect(
      mockEngineContext.AccountTrackerController.refresh,
    ).not.toHaveBeenCalled();
    expect(
      mockEngineContext.TokenBalancesController._executePoll,
    ).not.toHaveBeenCalled();
  });

  it('returns undefined when no account group is selected', async () => {
    arrangeSuccessfulRefresh(50);
    // selectBalanceBySelectedAccountGroup resolves null without a selection.
    mockSelectBalanceBySelectedAccountGroup.mockReturnValue(() => null);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
  });

  it('returns undefined when the balance is not a finite number', async () => {
    arrangeSuccessfulRefresh(NaN);

    const range = await fetchImportedWalletFundingAmountRange();

    expect(range).toBeUndefined();
  });
});
