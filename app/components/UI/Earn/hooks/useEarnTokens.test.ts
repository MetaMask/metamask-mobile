import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../util/test/initial-root-state';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import useEarnTokens from './useEarnTokens';
import {
  MOCK_USDC_BASE_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
  MOCK_ETH_MAINNET_ASSET,
  MOCK_USDT_MAINNET_ASSET,
  MOCK_DAI_MAINNET_ASSET,
  MOCK_GET_POOLED_STAKES_API_RESPONSE,
} from '../../Stake/__mocks__/mockData';
import { EarnControllerState } from '@metamask/earn-controller';

const mockPooledStakeData = MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0];
const mockExchangeRate = MOCK_GET_POOLED_STAKES_API_RESPONSE.exchangeRate;

const mockInitialEarnControllerState: DeepPartial<EarnControllerState> = {
  pooled_staking: {
    pooledStakes: mockPooledStakeData,
    exchangeRate: mockExchangeRate,
  },
};

const mockStateWithEarnFeatureFlags = ({
  pooledStakingEnabled = true,
  isEligibleToPoolStake = true,
  stablecoinLendingEnabled = true,
}: Partial<{
  pooledStakingEnabled: boolean;
  isEligibleToPoolStake: boolean;
  stablecoinLendingEnabled: boolean;
}> = {}) => ({
  ...initialRootState,
  engine: {
    ...initialRootState.engine,
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          earnPooledStakingEnabled: pooledStakingEnabled,
          earnStablecoinLendingEnabled: stablecoinLendingEnabled,
        },
      },
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

const initialState = mockStateWithEarnFeatureFlags();

jest.mock('../../../../selectors/multichain', () => ({
  selectAccountTokensAcrossChains: jest.fn(() => ({
    '0x1': [
      MOCK_ETH_MAINNET_ASSET,
      MOCK_USDC_MAINNET_ASSET,
      MOCK_USDT_MAINNET_ASSET,
      MOCK_DAI_MAINNET_ASSET,
    ],
    '0x2105': [MOCK_USDC_BASE_MAINNET_ASSET],
  })),
}));

describe('useEarnTokens', () => {
  it('returns all pooled-staking and supported stablecoins when all feature flags enabled and user is eligible', () => {
    const { result } = renderHookWithProvider(() => useEarnTokens(), {
      state: initialState,
    });

    expect(result.current.length).toBe(5);

    const supportedEarnTokenSet = new Set(
      result.current.map((token) => token.symbol),
    );

    const expectedSupportedTokens = [
      MOCK_ETH_MAINNET_ASSET,
      MOCK_USDC_MAINNET_ASSET,
      MOCK_USDT_MAINNET_ASSET,
      MOCK_DAI_MAINNET_ASSET,
      MOCK_USDC_BASE_MAINNET_ASSET,
    ];

    const hasExpectedTokens = expectedSupportedTokens.every((token) =>
      supportedEarnTokenSet.has(token.symbol),
    );

    expect(hasExpectedTokens).toBe(true);
  });

  it('filters out pooled-staking tokens when pooled-staking feature flag is disabled', () => {
    const stateWithPooledStakingDisabled = mockStateWithEarnFeatureFlags({
      pooledStakingEnabled: false,
    });

    const { result } = renderHookWithProvider(() => useEarnTokens(), {
      state: stateWithPooledStakingDisabled,
    });

    expect(result.current.length).toBe(4);

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
    const stateWhereUserIsNotEligibleToStake = mockStateWithEarnFeatureFlags({
      isEligibleToPoolStake: false,
    });

    const { result } = renderHookWithProvider(() => useEarnTokens(), {
      state: stateWhereUserIsNotEligibleToStake,
    });

    expect(result.current.length).toBe(4);

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

  it('filters out stablecoin lending tokens when stablecoin lending feature flag is disabled', () => {
    const stateWithLendingDisabled = mockStateWithEarnFeatureFlags({
      stablecoinLendingEnabled: false,
    });

    const { result } = renderHookWithProvider(() => useEarnTokens(), {
      state: stateWithLendingDisabled,
    });

    expect(result.current.length).toBe(1);
    expect(result.current[0].symbol).toStrictEqual(
      MOCK_ETH_MAINNET_ASSET.symbol,
    );
  });

  it('returns empty array when pooled-staking and stablecoin lending are disabled', () => {
    const stateWithStakingAndLendingDisabled = mockStateWithEarnFeatureFlags({
      pooledStakingEnabled: false,
      stablecoinLendingEnabled: false,
    });

    const { result } = renderHookWithProvider(() => useEarnTokens(), {
      state: stateWithStakingAndLendingDisabled,
    });

    expect(result.current.length).toBe(0);
  });
});
