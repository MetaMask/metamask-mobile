// write tests for StakingButtons.tsx
import React from 'react';
import StakingButtons from './StakingButtons';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { act, fireEvent } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { mockNetworkState } from '../../../../../../util/test/network';
import Routes from '../../../../../../constants/navigation/Routes';
import useStakingChain from '../../../hooks/useStakingChain';
import useStakingEligibility from '../../../hooks/useStakingEligibility';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { MOCK_ETH_MAINNET_ASSET } from '../../../__mocks__/stakeMockData';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../../../../../../component-library/components-temp/BoxGlass';

// The glass tests need the OS to draw glass, which Jest can't.
jest.mock('../../../../../../component-library/hooks/useLiquidGlass', () => {
  const actual = jest.requireActual(
    '../../../../../../component-library/hooks/useLiquidGlass',
  );
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: true,
    }),
  };
});
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../../Earn/selectors/featureFlags';
import { TokenI } from '../../../../Tokens/types';
import { EARN_EXPERIENCES } from '../../../../Earn/constants/experiences';
import { getMockUseEarnTokens } from '../../../../Earn/__mocks__/earnMockData';
import { earnSelectors } from '../../../../../../selectors/earnController';

const mockEarnTokenPair = getMockUseEarnTokens(EARN_EXPERIENCES.POOLED_STAKING);
const mockShowEarnToast = jest.fn();
const mockMissingTokenToast = {};
const mockTrackEvent = jest.fn();

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    }),
  }),
}));

jest.mock('../../../../Earn/hooks/useEarnToasts', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showToast: mockShowEarnToast,
    EarnToastOptions: {
      earnWithdrawal: {
        detailsUnavailable: mockMissingTokenToast,
      },
    },
  })),
}));

type MockSelectPooledStakingEnabledFlagSelector = jest.MockedFunction<
  typeof selectPooledStakingEnabledFlag
>;

const MOCK_APR_VALUES: { [symbol: string]: string } = {
  Ethereum: '2.3',
  USDC: '4.5',
  USDT: '4.1',
  DAI: '5.0',
};

jest.mock('../../../../../../selectors/earnController', () => ({
  ...jest.requireActual('../../../../../../selectors/earnController'),
  earnSelectors: {
    selectEarnTokenPair: jest
      .fn()
      .mockImplementation((_token: TokenI) => mockEarnTokenPair),
    selectEarnOutputToken: jest
      .fn()
      .mockImplementation((_token: TokenI) => mockEarnTokenPair.outputToken),
    selectEarnToken: jest.fn().mockImplementation((token: TokenI) => {
      const experienceType =
        token.symbol === 'USDC' ? 'STABLECOIN_LENDING' : 'POOLED_STAKING';

      const experiences = [
        {
          type: experienceType as EARN_EXPERIENCES,
          apr: MOCK_APR_VALUES?.[token.symbol] ?? '',
          estimatedAnnualRewardsFormatted: '',
          estimatedAnnualRewardsFiatNumber: 0,
        },
      ];

      return {
        ...token,
        balanceFormatted: token.symbol === 'USDC' ? '6.84314 USDC' : '0',
        balanceFiat: token.symbol === 'USDC' ? '$6.84' : '$0.00',
        balanceMinimalUnit: token.symbol === 'USDC' ? '6.84314' : '0',
        balanceFiatNumber: token.symbol === 'USDC' ? 6.84314 : 0,
        experiences,
        tokenUsdExchangeRate: 0,
        experience: experiences[0],
      };
    }),
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../../Earn/selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn(),
  selectStablecoinLendingEnabledFlag: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
  },
}));

jest.mock('../../../hooks/useStakingChain', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isStakingSupportedChain: true,
  })),
}));

jest.mock('../../../hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseStakingEligibility = useStakingEligibility as jest.MockedFunction<
  typeof useStakingEligibility
>;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const mockSepoliaNetworkState = {
  ...mockInitialState,
  engine: {
    ...mockInitialState.engine,
    backgroundState: {
      ...mockInitialState.engine.backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.SEPOLIA,
          id: 'sepolia',
          nickname: 'Sepolia',
          ticker: 'ETH',
        }),
      },
    },
  },
};

describe('StakingButtons', () => {
  const navigate: jest.Mock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (
      useNavigation as jest.MockedFunction<typeof useNavigation>
    ).mockReturnValue({
      navigate,
      setOptions: jest.fn(),
      dispatch: jest.fn(),
    } as unknown as NavigationProp<ParamListBase>);

    mockUseStakingEligibility.mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    (
      selectPooledStakingEnabledFlag as MockSelectPooledStakingEnabledFlagSelector
    ).mockReturnValue(true);
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);
  });

  it('should render the stake and unstake buttons', () => {
    const props = {
      style: {},
      hasStakedPositions: true,
      hasEthToUnstake: true,
      asset: MOCK_ETH_MAINNET_ASSET,
    };
    const { getByText } = renderWithProvider(<StakingButtons {...props} />, {
      state: mockInitialState,
    });
    expect(getByText('Unstake')).toBeDefined();
    expect(getByText('Stake more')).toBeDefined();
  });

  it('renders unstake button and hides stake button when user is not eligible', () => {
    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const props = {
      style: {},
      hasStakedPositions: true,
      hasEthToUnstake: true,
      asset: MOCK_ETH_MAINNET_ASSET,
    };

    const { getByText, queryByText } = renderWithProvider(
      <StakingButtons {...props} />,
      {
        state: mockInitialState,
      },
    );

    expect(getByText('Unstake')).toBeDefined();
    expect(queryByText('Stake more')).toBeNull();
    expect(queryByText('Stake')).toBeNull();
  });

  it('should not render stake/stake more button if pooled staking is disabled', () => {
    (
      selectPooledStakingEnabledFlag as MockSelectPooledStakingEnabledFlagSelector
    ).mockReturnValue(false);

    const props = {
      style: {},
      hasStakedPositions: true,
      hasEthToUnstake: true,
      asset: MOCK_ETH_MAINNET_ASSET,
    };
    const { getByText, queryByText } = renderWithProvider(
      <StakingButtons {...props} />,
      {
        state: mockInitialState,
      },
    );

    // Don't prevent users from unstaking
    expect(getByText('Unstake')).toBeDefined();
    expect(queryByText('Stake more')).toBeNull();
    expect(queryByText('Stake')).toBeNull();
  });

  it('should switch to mainnet if the chain is not supported on press of stake button', async () => {
    (useStakingChain as jest.Mock).mockReturnValue({
      isStakingSupportedChain: false,
    });
    const props = {
      style: {},
      hasStakedPositions: true,
      hasEthToUnstake: true,
      asset: MOCK_ETH_MAINNET_ASSET,
    };
    const { getByText } = renderWithProvider(<StakingButtons {...props} />, {
      state: mockSepoliaNetworkState,
    });

    await act(async () => {
      fireEvent.press(getByText('Stake more'));
    });

    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('mainnet');
    expect(navigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: MOCK_ETH_MAINNET_ASSET,
      },
    });
  });

  it('should switch to mainnet if the chain is not supported on press of unstake button', async () => {
    (useStakingChain as jest.Mock).mockReturnValue({
      isStakingSupportedChain: false,
    });
    const props = {
      style: {},
      hasStakedPositions: true,
      hasEthToUnstake: true,
      asset: MOCK_ETH_MAINNET_ASSET,
    };
    const { getByText } = renderWithProvider(<StakingButtons {...props} />, {
      state: mockSepoliaNetworkState,
    });

    await act(async () => {
      fireEvent.press(getByText('Unstake'));
    });

    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).toHaveBeenCalledWith('mainnet');
    expect(navigate).toHaveBeenCalledWith('StakeScreens', {
      params: {
        token: mockEarnTokenPair.outputToken,
      },
      screen: Routes.STAKING.UNSTAKE,
    });
  });

  it('shows an error toast and does not navigate when output token is missing', async () => {
    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValueOnce({
      earnToken: undefined,
      outputToken: undefined,
    });

    const props = {
      style: {},
      hasStakedPositions: true,
      hasEthToUnstake: true,
      asset: MOCK_ETH_MAINNET_ASSET,
    };
    const { getByText } = renderWithProvider(<StakingButtons {...props} />, {
      state: mockInitialState,
    });

    await act(async () => {
      fireEvent.press(getByText('Unstake'));
    });

    expect(mockShowEarnToast).toHaveBeenCalledWith(mockMissingTokenToast);
    expect(navigate).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  describe('glass', () => {
    const glassProps = {
      hasStakedPositions: true,
      hasEthToUnstake: true,
      asset: MOCK_ETH_MAINNET_ASSET,
    };

    it('keeps the plain secondary buttons by default', () => {
      const { queryAllByTestId } = renderWithProvider(
        <StakingButtons {...glassProps} />,
        { state: mockInitialState },
      );

      expect(queryAllByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toHaveLength(0);
    });

    it('draws Unstake and Stake more on glass with the sheen', () => {
      const { getAllByTestId, getByText } = renderWithProvider(
        <StakingButtons {...glassProps} isGlass />,
        { state: mockInitialState },
      );

      expect(getAllByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toHaveLength(2);
      expect(getByText('Unstake')).toBeOnTheScreen();
      expect(getByText('Stake more')).toBeOnTheScreen();
    });
  });
});
