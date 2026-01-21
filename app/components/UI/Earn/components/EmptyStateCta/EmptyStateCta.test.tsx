import React from 'react';
import EarnEmptyStateCta from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TokenI } from '../../../Tokens/types';
import { MOCK_USDC_MAINNET_ASSET } from '../../../Stake/__mocks__/stakeMockData';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import initialRootState from '../../../../../util/test/initial-root-state';
import { strings } from '../../../../../../locales/i18n';
import { act, fireEvent } from '@testing-library/react-native';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import {
  EVENT_LOCATIONS,
  EVENT_PROVIDERS,
} from '../../constants/events/earnEvents';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../selectors/featureFlags';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { EarnTokenDetails, LendingProtocol } from '../../types/lending.types';
import useEarnTokens from '../../hooks/useEarnTokens';
import { earnSelectors } from '../../../../../selectors/earnController';
import Engine from '../../../../../core/Engine';
import useStakingEligibility from '../../../Stake/hooks/useStakingEligibility';

jest.mock('../../../../hooks/useMetrics');
jest.mock('../../hooks/useEarnTokens', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
      setActiveNetwork: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn(),
  selectPooledStakingEnabledFlag: jest.fn(),
}));
jest.mock('../../../../../selectors/earnController', () => ({
  earnSelectors: {
    selectEarnToken: jest.fn(),
    selectEarnTokenPair: jest.fn(),
    selectEarnOutputToken: jest.fn(),
  },
}));

jest.mock('../../../Stake/hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseStakingEligibility = useStakingEligibility as jest.MockedFunction<
  typeof useStakingEligibility
>;

const initialState = {
  ...initialRootState,
  engine: {
    ...initialRootState.engine,
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      EarnController: {
        pooled_staking: {
          isEligible: true,
        },
        lending: {
          isEligible: true,
          markets: [],
          positions: [],
        },
      },
    },
  },
};

const mockEarnToken: EarnTokenDetails = {
  ...MOCK_USDC_MAINNET_ASSET,
  balanceFormatted: '100.00 USDC',
  balanceMinimalUnit: '100000000',
  balanceFiatNumber: 100,
  tokenUsdExchangeRate: 1,
  experience: {
    type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    apr: '4.5',
    estimatedAnnualRewardsFormatted: '5',
    estimatedAnnualRewardsFiatNumber: 4.5,
    estimatedAnnualRewardsTokenMinimalUnit: '4500000',
    estimatedAnnualRewardsTokenFormatted: '4.50 USDC',
    market: {
      id: '0x123',
      chainId: 1,
      protocol: LendingProtocol.AAVE,
      name: 'USDC Market',
      address: '0x123',
      netSupplyRate: 4.5,
      totalSupplyRate: 4.5,
      rewards: [],
      tvlUnderlying: '1000000',
      underlying: {
        address: MOCK_USDC_MAINNET_ASSET.address,
        chainId: 1,
      },
      outputToken: {
        address: '0x456',
        chainId: 1,
      },
      position: {
        id: '0x123-0x456-COLLATERAL-0',
        chainId: 1,
        assets: '1000000',
        marketId: '0x123',
        marketAddress: '0x123',
        protocol: LendingProtocol.AAVE,
      },
    },
  },
  experiences: [
    {
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      apr: '4.5',
      estimatedAnnualRewardsFormatted: '5',
      estimatedAnnualRewardsFiatNumber: 4.5,
      estimatedAnnualRewardsTokenMinimalUnit: '4500000',
      estimatedAnnualRewardsTokenFormatted: '4.50 USDC',
      market: {
        id: '0x123',
        chainId: 1,
        protocol: LendingProtocol.AAVE,
        name: 'USDC Market',
        address: '0x123',
        netSupplyRate: 4.5,
        totalSupplyRate: 4.5,
        rewards: [],
        tvlUnderlying: '1000000',
        underlying: {
          address: MOCK_USDC_MAINNET_ASSET.address,
          chainId: 1,
        },
        outputToken: {
          address: '0x456',
          chainId: 1,
        },
        position: {
          id: '0x123-0x456-COLLATERAL-0',
          chainId: 1,
          assets: '1000000',
          marketId: '0x123',
          marketAddress: '0x123',
          protocol: LendingProtocol.AAVE,
        },
      },
    },
  ],
};
const mockExperience = {
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
  apr: '4.5',
  estimatedAnnualRewardsFormatted: '5',
  estimatedAnnualRewardsFiatNumber: 4.5,
  estimatedAnnualRewardsTokenMinimalUnit: '4500000',
  estimatedAnnualRewardsTokenFormatted: '4.50 USDC',
  market: {
    id: '0x123',
    chainId: 1,
    protocol: LendingProtocol.AAVE,
    name: 'USDC Market',
    address: '0x123',
    netSupplyRate: 4.5,
    totalSupplyRate: 4.5,
    rewards: [],
    tvlUnderlying: '1000000',
    underlying: {
      address: MOCK_USDC_MAINNET_ASSET.address,
      chainId: 1,
    },
    outputToken: {
      address: '0x456',
      chainId: 1,
    },
    position: {
      id: '0x123-0x456-COLLATERAL-0',
      chainId: 1,
      assets: '1000000',
      marketId: '0x123',
      marketAddress: '0x123',
      protocol: LendingProtocol.AAVE,
    },
  },
};

const renderComponent = (token: TokenI, state = initialState) =>
  renderWithProvider(<EarnEmptyStateCta token={token} />, {
    state,
  });

describe('EmptyStateCta', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
      isDataRecorded: jest.fn(),
      isEnabled: jest.fn(),
      getMetaMetricsId: jest.fn(),
    });

    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);

    (
      selectPooledStakingEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingEnabledFlag
      >
    ).mockReturnValue(true);

    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      earnToken: {
        ...mockEarnToken,
        experience: mockExperience,
      },
      outputToken: undefined,
    });

    (
      earnSelectors.selectEarnToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnToken
      >
    ).mockReturnValue({
      ...mockEarnToken,
      experience: mockExperience,
    });

    (
      earnSelectors.selectEarnOutputToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnOutputToken
      >
    ).mockReturnValue(undefined);

    (useEarnTokens as jest.Mock).mockReturnValue({
      getEarnToken: () => mockEarnToken,
      getOutputToken: () => null,
      getPairedEarnTokens: () => ({
        earnToken: mockEarnToken,
        outputToken: null,
      }),
      getEarnExperience: () => mockEarnToken.experience,
      getEstimatedAnnualRewardsForAmount: () => ({
        estimatedAnnualRewardsFormatted: '$5',
        estimatedAnnualRewardsFiatNumber: 4.5,
        estimatedAnnualRewardsTokenMinimalUnit: '4500000',
        estimatedAnnualRewardsTokenFormatted: '4.50 USDC',
      }),
    });

    mockUseStakingEligibility.mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });
  });

  it('renders correctly', () => {
    const { toJSON } = renderComponent(mockEarnToken);
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to lending historic apy modal when "learn more" is clicked', async () => {
    const { findByText } = renderComponent(mockEarnToken);

    const learnMoreButton = await findByText(
      strings('earn.empty_state_cta.learn_more'),
    );

    await act(async () => {
      fireEvent.press(learnMoreButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('EarnModals', {
      params: {
        asset: mockEarnToken,
      },
      screen: 'EarnLendingLearnMoreModal',
    });
  });

  it('navigates to deposit screen when "earn" button is clicked', async () => {
    const { findByText } = renderComponent(mockEarnToken);

    const startEarningButton = await findByText(
      strings('earn.empty_state_cta.earn'),
    );

    await act(async () => {
      fireEvent.press(startEarningButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      params: {
        token: mockEarnToken,
      },
      screen: 'Stake',
    });
  });

  it('submits metrics event on "earn" button click', async () => {
    const { findByText } = renderComponent(mockEarnToken);

    const startEarningButton = await findByText(
      strings('earn.empty_state_cta.earn'),
    );

    await act(async () => {
      fireEvent.press(startEarningButton);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: MetaMetricsEvents.EARN_EMPTY_STATE_CTA_CLICKED.category,
      properties: {
        estimatedAnnualRewards: '5',
        location: EVENT_LOCATIONS.TOKEN_DETAILS_SCREEN,
        provider: EVENT_PROVIDERS.CONSENSYS,
        apr: '4.5%',
        experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        text: 'Earn',
        token: 'USDC',
        token_chain_id: '1',
        token_name: 'USDC',
      },
      saveDataRecording: true,
      sensitiveProperties: {},
    });
  });

  it('calls NetworkController methods when "earn" button is clicked', async () => {
    const { findByText } = renderComponent(mockEarnToken);

    (
      Engine.context.NetworkController.findNetworkClientIdByChainId as jest.Mock
    ).mockReturnValue('test-network-client-id');
    (
      Engine.context.NetworkController.setActiveNetwork as jest.Mock
    ).mockResolvedValue(undefined);

    const startEarningButton = await findByText(
      strings('earn.empty_state_cta.earn'),
    );

    await act(async () => {
      fireEvent.press(startEarningButton);
    });

    expect(
      Engine.context.NetworkController
        .findNetworkClientIdByChainId as jest.Mock,
    ).toHaveBeenCalledWith(mockEarnToken.chainId);
    expect(
      Engine.context.NetworkController.setActiveNetwork as jest.Mock,
    ).toHaveBeenCalledWith('test-network-client-id');
  });

  it('handles case when network client ID is not found', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (
      Engine.context.NetworkController.findNetworkClientIdByChainId as jest.Mock
    ).mockReturnValue(null);

    const { findByText } = renderComponent(mockEarnToken);

    const startEarningButton = await findByText(
      strings('earn.empty_state_cta.earn'),
    );

    await act(async () => {
      fireEvent.press(startEarningButton);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      `EarnDepositTokenListItem redirect failed: could not retrieve networkClientId for chainId: ${mockEarnToken.chainId}`,
    );
    expect(
      Engine.context.NetworkController.setActiveNetwork as jest.Mock,
    ).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('does not render if token prop is missing', () => {
    const { toJSON } = renderComponent({} as TokenI);
    expect(toJSON()).toBeNull();
  });

  it('does not render if stablecoin lending feature flag is disabled', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);

    const { toJSON } = renderComponent(mockEarnToken);
    expect(toJSON()).toBeNull();
  });

  it('does not render when user is not eligible', () => {
    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const { toJSON } = renderComponent(mockEarnToken);

    expect(toJSON()).toBeNull();
  });
});
