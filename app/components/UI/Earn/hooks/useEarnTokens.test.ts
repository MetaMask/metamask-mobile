import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../util/test/initial-root-state';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import useEarnTokens, { useHasSupportedStablecoin } from './useEarnTokens';
import {
  MOCK_USDC_BASE_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
  MOCK_ETH_MAINNET_ASSET,
  MOCK_USDT_MAINNET_ASSET,
  MOCK_DAI_MAINNET_ASSET,
  MOCK_GET_POOLED_STAKES_API_RESPONSE,
  MOCK_AETHUSDC_MAINNET_ASSET,
  MOCK_AUSDT_MAINNET_ASSET,
  MOCK_ADAI_MAINNET_ASSET,
  MOCK_ABASUSDC_BASE_MAINNET_ASSET,
} from '../../Stake/__mocks__/stakeMockData';
import { EarnControllerState } from '@metamask/earn-controller';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../selectors/featureFlags';
import { selectAccountTokensAcrossChains } from '../../../../selectors/multichain';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestMockVar = any;

const mockPooledStakeData = MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0];
const mockExchangeRate = MOCK_GET_POOLED_STAKES_API_RESPONSE.exchangeRate;

const mockInitialEarnControllerState: DeepPartial<EarnControllerState> = {
  pooled_staking: {
    pooledStakes: mockPooledStakeData,
    exchangeRate: mockExchangeRate,
  },
};

const mockState = ({
  isEligibleToPoolStake = true,
}: Partial<{
  isEligibleToPoolStake: boolean;
}> = {}) => ({
  ...initialRootState,
  engine: {
    ...initialRootState.engine,
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      EarnController: {
        ...mockInitialEarnControllerState,
        pooled_staking: {
          ...mockInitialEarnControllerState.pooled_staking,
          pooledStakes: mockPooledStakeData,
          exchangeRate: mockExchangeRate,
          isEligible: isEligibleToPoolStake,
        },
      },
    },
  },
});

const initialState = mockState();

jest.mock('../../../../selectors/multichain', () => ({
  selectAccountTokensAcrossChains: jest.fn(() => ({
    '0x1': [
      MOCK_ETH_MAINNET_ASSET,
      MOCK_USDC_MAINNET_ASSET,
      MOCK_USDT_MAINNET_ASSET,
      MOCK_DAI_MAINNET_ASSET,
      MOCK_AETHUSDC_MAINNET_ASSET,
      MOCK_AUSDT_MAINNET_ASSET,
      MOCK_ADAI_MAINNET_ASSET,
    ],
    '0x2105': [MOCK_USDC_BASE_MAINNET_ASSET, MOCK_ABASUSDC_BASE_MAINNET_ASSET],
  })),
}));

jest.mock('../selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn(),
  selectStablecoinLendingEnabledFlag: jest.fn(),
}));

interface MockEarnFeatureFlagOptions {
  pooledStakingEnabledFlag: boolean;
  stablecoinLendingEnabledFlag: boolean;
}

const mockEarnFeatureFlagSelectors = ({
  pooledStakingEnabledFlag,
  stablecoinLendingEnabledFlag,
}: MockEarnFeatureFlagOptions) => {
  if (pooledStakingEnabledFlag) {
    (
      selectPooledStakingEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingEnabledFlag
      >
    ).mockReturnValue(true);
  }

  if (stablecoinLendingEnabledFlag) {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);
  }
};

const resetMockedEarnFeatureFlagSelectors = () => {
  (
    selectPooledStakingEnabledFlag as jest.MockedFunction<
      typeof selectPooledStakingEnabledFlag
    >
  ).mockReturnValue(false);

  (
    selectStablecoinLendingEnabledFlag as jest.MockedFunction<
      typeof selectStablecoinLendingEnabledFlag
    >
  ).mockReturnValue(false);
};

describe('useEarnTokens', () => {
  beforeEach(() => {
    resetMockedEarnFeatureFlagSelectors();
  });

  describe('All Tokens', () => {
    it('returns all pooled-staking, supported stablecoins, and supported receipt tokens when all feature flags enabled and user is eligible', () => {
      mockEarnFeatureFlagSelectors({
        pooledStakingEnabledFlag: true,
        stablecoinLendingEnabledFlag: true,
      });

      const { result } = renderHookWithProvider(
        () =>
          useEarnTokens({
            includeStakingTokens: true,
            includeLendingTokens: true,
            includeReceiptTokens: true,
          }),
        {
          state: initialState,
        },
      );

      expect(result.current.length).toBe(9);

      const supportedEarnTokenSet = new Set(
        result.current.map((token) => token.symbol),
      );

      const expectedSupportedTokens = [
        // Ethereum mainnet
        MOCK_ETH_MAINNET_ASSET,
        MOCK_USDC_MAINNET_ASSET,
        MOCK_AETHUSDC_MAINNET_ASSET,
        MOCK_USDT_MAINNET_ASSET,
        MOCK_AUSDT_MAINNET_ASSET,
        MOCK_DAI_MAINNET_ASSET,
        MOCK_ADAI_MAINNET_ASSET,
        // Base
        MOCK_USDC_BASE_MAINNET_ASSET,
        MOCK_ABASUSDC_BASE_MAINNET_ASSET,
      ];

      const hasExpectedTokens = expectedSupportedTokens.every((token) =>
        supportedEarnTokenSet.has(token.symbol),
      );

      expect(hasExpectedTokens).toBe(true);
    });

    it('returns empty array when pooled-staking and stablecoin lending are disabled', () => {
      mockEarnFeatureFlagSelectors({
        pooledStakingEnabledFlag: false,
        stablecoinLendingEnabledFlag: false,
      });

      const stateWithStakingAndLendingDisabled = mockState();

      const { result } = renderHookWithProvider(
        () =>
          useEarnTokens({
            includeStakingTokens: true,
            includeLendingTokens: true,
            includeReceiptTokens: true,
          }),
        {
          state: stateWithStakingAndLendingDisabled,
        },
      );

      expect(result.current.length).toBe(0);
    });

    it('returns no tokens when filter is not defined', () => {
      mockEarnFeatureFlagSelectors({
        pooledStakingEnabledFlag: true,
        stablecoinLendingEnabledFlag: true,
      });

      const stateWithLendingDisabled = mockState();

      const { result } = renderHookWithProvider(() => useEarnTokens(), {
        state: stateWithLendingDisabled,
      });

      expect(result.current.length).toBe(0);
    });
  });

  describe('Pooled-Staking Tokens', () => {
    it('filters out pooled-staking tokens when pooled-staking feature flag is disabled', () => {
      mockEarnFeatureFlagSelectors({
        pooledStakingEnabledFlag: false,
        stablecoinLendingEnabledFlag: true,
      });

      const stateWithPooledStakingDisabled = mockState();

      const { result } = renderHookWithProvider(
        () =>
          useEarnTokens({
            includeStakingTokens: true,
            includeLendingTokens: true,
            includeReceiptTokens: true,
          }),
        {
          state: stateWithPooledStakingDisabled,
        },
      );

      expect(result.current.length).toBe(8);

      const supportedEarnTokenSet = new Set(
        result.current.map((token) => token.symbol),
      );

      // Stablecoin lending assets only since pooled-staking have been filtered out.
      const expectedSupportedTokens = [
        MOCK_USDC_MAINNET_ASSET,
        MOCK_USDT_MAINNET_ASSET,
        MOCK_DAI_MAINNET_ASSET,
        MOCK_USDC_BASE_MAINNET_ASSET,
      ];

      const hasExpectedTokens = expectedSupportedTokens.every((token) =>
        supportedEarnTokenSet.has(token.symbol),
      );

      expect(hasExpectedTokens).toBe(true);

      const hasPooledStakingTokens = supportedEarnTokenSet.has('Ethereum');

      expect(hasPooledStakingTokens).toBe(false);
    });

    it("filters out pooled-staking tokens when user isn't eligible to pool-stake", () => {
      mockEarnFeatureFlagSelectors({
        pooledStakingEnabledFlag: true,
        stablecoinLendingEnabledFlag: true,
      });

      const stateWhereUserIsNotEligibleToStake = mockState({
        isEligibleToPoolStake: false,
      });

      const { result } = renderHookWithProvider(
        () =>
          useEarnTokens({
            includeStakingTokens: true,
            includeLendingTokens: true,
            includeReceiptTokens: true,
          }),
        {
          state: stateWhereUserIsNotEligibleToStake,
        },
      );

      expect(result.current.length).toBe(8);

      const supportedEarnTokenSet = new Set(
        result.current.map((token) => token.symbol),
      );

      // Stablecoin lending assets only since pooled-staking have been filtered out.
      const expectedSupportedTokens = [
        MOCK_USDC_MAINNET_ASSET,
        MOCK_USDT_MAINNET_ASSET,
        MOCK_DAI_MAINNET_ASSET,
        MOCK_USDC_BASE_MAINNET_ASSET,
      ];

      const hasExpectedTokens = expectedSupportedTokens.every((token) =>
        supportedEarnTokenSet.has(token.symbol),
      );

      expect(hasExpectedTokens).toBe(true);

      const hasPooledStakingTokens = supportedEarnTokenSet.has('Ethereum');

      expect(hasPooledStakingTokens).toBe(false);
    });

    it('returns only staking tokens when desired', () => {
      mockEarnFeatureFlagSelectors({
        pooledStakingEnabledFlag: true,
        stablecoinLendingEnabledFlag: true,
      });

      const { result } = renderHookWithProvider(
        () =>
          useEarnTokens({
            includeStakingTokens: true,
          }),
        {
          state: initialState,
        },
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].symbol).toStrictEqual(
        MOCK_ETH_MAINNET_ASSET.symbol,
      );
    });
  });

  describe('Lending and Receipt Tokens', () => {
    it('filters out lending and receipt tokens when stablecoin lending feature flag is disabled', () => {
      mockEarnFeatureFlagSelectors({
        pooledStakingEnabledFlag: true,
        stablecoinLendingEnabledFlag: false,
      });

      const stateWithLendingDisabled = mockState();

      const { result } = renderHookWithProvider(
        () =>
          useEarnTokens({
            includeStakingTokens: true,
            includeLendingTokens: true,
            includeReceiptTokens: true,
          }),
        {
          state: stateWithLendingDisabled,
        },
      );

      expect(result.current.length).toBe(1);
      expect(result.current[0].symbol).toStrictEqual(
        MOCK_ETH_MAINNET_ASSET.symbol,
      );
    });

    it('returns only lending tokens when desired', () => {
      mockEarnFeatureFlagSelectors({
        pooledStakingEnabledFlag: true,
        stablecoinLendingEnabledFlag: true,
      });

      const stateWithLendingDisabled = mockState();

      const { result } = renderHookWithProvider(
        () =>
          useEarnTokens({
            includeLendingTokens: true,
          }),
        {
          state: stateWithLendingDisabled,
        },
      );

      expect(result.current.length).toBe(4);

      const supportedEarnTokenSet = new Set(
        result.current.map((token) => token.symbol),
      );

      const expectedSupportedTokens = [
        // Ethereum mainnet
        MOCK_USDC_MAINNET_ASSET,
        MOCK_USDT_MAINNET_ASSET,
        MOCK_DAI_MAINNET_ASSET,
        // Base
        MOCK_USDC_BASE_MAINNET_ASSET,
      ];

      const hasExpectedTokens = expectedSupportedTokens.every((token) =>
        supportedEarnTokenSet.has(token.symbol),
      );

      expect(hasExpectedTokens).toBe(true);
    });

    it('returns only lending receipt tokens when desired', () => {
      mockEarnFeatureFlagSelectors({
        pooledStakingEnabledFlag: true,
        stablecoinLendingEnabledFlag: true,
      });

      const stateWithLendingDisabled = mockState();

      const { result } = renderHookWithProvider(
        () =>
          useEarnTokens({
            includeReceiptTokens: true,
          }),
        {
          state: stateWithLendingDisabled,
        },
      );

      expect(result.current.length).toBe(4);

      const supportedEarnTokenSet = new Set(
        result.current.map((token) => token.symbol),
      );

      const expectedSupportedTokens = [
        // Ethereum mainnet
        MOCK_AETHUSDC_MAINNET_ASSET,
        MOCK_AUSDT_MAINNET_ASSET,
        MOCK_ADAI_MAINNET_ASSET,
        // Base
        MOCK_ABASUSDC_BASE_MAINNET_ASSET,
      ];

      const hasExpectedTokens = expectedSupportedTokens.every((token) =>
        supportedEarnTokenSet.has(token.symbol),
      );

      expect(hasExpectedTokens).toBe(true);
    });
  });
});

describe('useHasSupportedStablecoin', () => {
  const mockChainId = '0x1' as const;
  const mockTokenSymbol = 'USDC';
  const mockTokens = [
    {
      chainId: '0x1',
      symbol: 'USDC',
      address: '0x123',
      decimals: 6,
    },
    {
      chainId: '0x1',
      symbol: 'USDT',
      address: '0x456',
      decimals: 6,
    },
  ];

  const arrange = () => {
    const mockSelectAccountTokensAcrossChains = jest.mocked(
      selectAccountTokensAcrossChains,
    );
    return {
      mockSelectAccountTokensAcrossChains,
    };
  };

  const validParamsTestMatrix = [
    {
      description: 'token exists, symbol matches, isStaked true',
      params: {
        tokenChainId: mockChainId,
        tokenSymbol: mockTokenSymbol,
        isStaked: true,
      },
      mockTokensData: { [mockChainId]: mockTokens },
      expected: true,
    },
    {
      description: 'token exists, symbol matches, isStaked false',
      params: {
        tokenChainId: mockChainId,
        tokenSymbol: mockTokenSymbol,
        isStaked: false,
      },
      mockTokensData: { [mockChainId]: mockTokens },
      expected: false,
    },
    {
      description: 'token exists, symbol matches, isStaked undefined',
      params: {
        tokenChainId: mockChainId,
        tokenSymbol: mockTokenSymbol,
        isStaked: undefined,
      },
      mockTokensData: { [mockChainId]: mockTokens },
      expected: false,
    },
    {
      description: 'token exists, symbol does not match, isStaked true',
      params: {
        tokenChainId: mockChainId,
        tokenSymbol: 'NONEXISTENT',
        isStaked: true,
      },
      mockTokensData: { [mockChainId]: mockTokens },
      expected: false,
    },
    {
      description: 'token does not exist, isStaked true',
      params: {
        tokenChainId: mockChainId,
        tokenSymbol: mockTokenSymbol,
        isStaked: true,
      },
      mockTokensData: { [mockChainId]: [] },
      expected: false,
    },
  ];

  it.each(validParamsTestMatrix)(
    'return $expected when $description',
    (testcase) => {
      const mocks = arrange();
      mocks.mockSelectAccountTokensAcrossChains.mockReturnValue(
        testcase.mockTokensData,
      );

      const hook = renderHookWithProvider(
        () =>
          useHasSupportedStablecoin(
            testcase.params.tokenChainId,
            testcase.params.tokenSymbol,
            testcase.params.isStaked,
          ),
        {},
      );

      expect(hook.result.current).toBe(testcase.expected);
    },
  );

  const edgeCaseMatrix = [
    {
      description: 'tokens selector returns empty object',
      params: {
        tokenChainId: mockChainId,
        tokenSymbol: mockTokenSymbol,
        isStaked: true,
      },
      mockTokensData: {},
      expected: false,
    },
    {
      description: 'tokenSymbol is undefined',
      params: {
        tokenChainId: mockChainId,
        tokenSymbol: undefined,
        isStaked: true,
      },
      mockTokensData: { [mockChainId]: mockTokens },
      expected: false,
    },
  ];

  it.each(edgeCaseMatrix)('returns $expected when $description', (testcase) => {
    const mocks = arrange();
    mocks.mockSelectAccountTokensAcrossChains.mockReturnValue(
      testcase.mockTokensData as TestMockVar,
    );

    const hook = renderHookWithProvider(
      () =>
        useHasSupportedStablecoin(
          testcase.params.tokenChainId,
          testcase.params.tokenSymbol,
          testcase.params.isStaked,
        ),
      {},
    );

    expect(hook.result.current).toBe(testcase.expected);
  });
});
