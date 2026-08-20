import React from 'react';
import {
  MOCK_GET_POOLED_STAKES_API_RESPONSE,
  MOCK_ETH_MAINNET_ASSET,
} from '../../../__mocks__/stakeMockData';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MOCK_VAULT_APY_AVERAGES } from '../../../components/PoolStakingLearnMoreModal/mockVaultRewards';
import { selectPooledStakingEnabledFlag } from '../../../../Earn/selectors/featureFlags';
import usePooledStakes from '../../../hooks/usePooledStakes';
import { useStakingChainByChainId } from '../../../hooks/useStakingChain';
import useVaultApyAverages from '../../../hooks/useVaultApyAverages';
import StakingDiscovery from './StakingDiscovery';

jest.mock('../../../hooks/usePooledStakes', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../hooks/useStakingChain', () => ({
  __esModule: true,
  useStakingChainByChainId: jest.fn(),
}));

jest.mock('../../../hooks/useVaultApyAverages', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../Earn/selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn(),
}));

jest.mock('../StakingCta/StakingCta', () => ({
  __esModule: true,
  default: () => {
    const { View: MockView } = jest.requireActual('react-native');
    return <MockView testID="staking-discovery-cta" />;
  },
}));

jest.mock('../StakingButtons/StakingButtons', () => ({
  __esModule: true,
  default: ({ hasStakedPositions }: { hasStakedPositions: boolean }) => {
    const { Button: MockButton } = jest.requireActual(
      '@metamask/design-system-react-native',
    );

    return (
      <MockButton
        testID={
          hasStakedPositions
            ? 'staking-discovery-stake-more-button'
            : 'stake-more-button'
        }
      >
        Stake
      </MockButton>
    );
  },
}));

jest.mock('../../../sdk/stakeSdkProvider', () => ({
  StakeSDKProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUsePooledStakes = jest.mocked(usePooledStakes);
const mockUseStakingChainByChainId = jest.mocked(useStakingChainByChainId);
const mockUseVaultApyAverages = jest.mocked(useVaultApyAverages);
const mockSelectPooledStakingEnabledFlag = jest.mocked(
  selectPooledStakingEnabledFlag,
);

const defaultPooledStakes = {
  pooledStakesData: {
    ...MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0],
    assets: '0',
    lifetimeRewards: '0',
    exitRequests: [],
  },
  exchangeRate: MOCK_GET_POOLED_STAKES_API_RESPONSE.exchangeRate,
  hasStakedPositions: false,
  hasEthToUnstake: false,
  isLoadingPooledStakesData: false,
  hasNeverStaked: true,
  hasRewards: false,
  hasRewardsOnly: false,
  refreshPooledStakes: jest.fn(),
  error: null,
};

const defaultVaultApyAverages = {
  vaultApyAverages: MOCK_VAULT_APY_AVERAGES,
  refreshVaultApyAverages: jest.fn(),
  isLoadingVaultApyAverages: false,
  error: null,
};

const render = () =>
  renderWithProvider(<StakingDiscovery asset={MOCK_ETH_MAINNET_ASSET} />);

describe('StakingDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePooledStakes.mockReturnValue(defaultPooledStakes);
    mockUseStakingChainByChainId.mockReturnValue({
      isStakingSupportedChain: true,
    });
    mockUseVaultApyAverages.mockReturnValue(defaultVaultApyAverages);
    mockSelectPooledStakingEnabledFlag.mockReturnValue(true);
  });

  it('renders discovery CTA for native ETH without a pooled position', () => {
    const { getByTestId } = render();

    expect(getByTestId('staking-discovery-cta')).toBeOnTheScreen();
  });

  it('renders stake button for native ETH without a pooled position', () => {
    const { getByTestId } = render();

    expect(getByTestId('stake-more-button')).toBeOnTheScreen();
  });

  it('hides discovery CTA when a pooled position exists', () => {
    mockUsePooledStakes.mockReturnValue({
      ...defaultPooledStakes,
      hasStakedPositions: true,
    });

    const { queryByTestId } = render();

    expect(queryByTestId('staking-discovery-cta')).not.toBeOnTheScreen();
  });

  it('hides discovery CTA while vault APY is loading', () => {
    mockUseVaultApyAverages.mockReturnValue({
      ...defaultVaultApyAverages,
      isLoadingVaultApyAverages: true,
    });

    const { queryByTestId } = render();

    expect(queryByTestId('staking-discovery-cta')).not.toBeOnTheScreen();
  });

  it('hides discovery CTA when pooled staking is disabled', () => {
    mockSelectPooledStakingEnabledFlag.mockReturnValue(false);

    const { queryByTestId } = render();

    expect(queryByTestId('staking-discovery-cta')).not.toBeOnTheScreen();
  });

  it('hides discovery CTA on unsupported chains', () => {
    mockUseStakingChainByChainId.mockReturnValue({
      isStakingSupportedChain: false,
    });

    const { queryByTestId } = render();

    expect(queryByTestId('staking-discovery-cta')).not.toBeOnTheScreen();
  });
});
