import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import StakeButton from './index';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MOCK_ETH_MAINNET_ASSET } from '../../__mocks__/mockData';
import { useMetrics } from '../../../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { mockNetworkState } from '../../../../../util/test/network';
import AppConstants from '../../../../../core/AppConstants';
import useStakingEligibility from '../../hooks/useStakingEligibility';
import { RootState } from '../../../../../reducers';
import { SolScope } from '@metamask/keyring-api';
import Engine from '../../../../../core/Engine';
import { EARN_INPUT_VIEW_ACTIONS } from '../../../Earn/Views/EarnInputView/EarnInputView.types';
import { getVersion } from 'react-native-device-info';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';

const mockNavigate = jest.fn();

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
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

jest.mock('../../../../hooks/useMetrics');

// Mock the environment variables
jest.mock('../../../../../util/environment', () => ({
  isProduction: jest.fn().mockReturnValue(false),
}));

// Mock the feature flags selector
jest.mock('../../../Earn/selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn().mockReturnValue(true),
  selectStablecoinLendingEnabledFlag: jest.fn().mockReturnValue(true),
}));

(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: jest.fn(),
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

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(() => Promise.resolve()),
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      findNetworkClientIdByChainId: () => 'mainnet',
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
  },
}));

jest.mock('../../hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isEligible: true,
    isLoadingEligibility: false,
    refreshPooledStakingEligibility: jest.fn().mockResolvedValue({
      isEligible: true,
    }),
    error: false,
  })),
}));

// Update the top-level mock to use a mockImplementation that we can change
jest.mock('../../hooks/useStakingChain', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isStakingSupportedChain: true,
  })),
}));

// Import the mock function to control it in tests
const useStakingChain = jest.requireMock('../../hooks/useStakingChain').default;

const STATE_MOCK = {
  engine: {
    backgroundState: {
      NetworkController: {
        ...mockNetworkState({
          chainId: '0x1',
        }),
      },
      MultichainNetworkController: {
        isEvmSelected: true,
        selectedMultichainNetworkChainId: SolScope.Mainnet,

        multichainNetworkConfigurationsByChainId: {
          'bip122:000000000019d6689c085ae165831e93': {
            chainId: 'bip122:000000000019d6689c085ae165831e93',
            name: 'Bitcoin Mainnet',
            nativeCurrency: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
            isEvm: false,
          },
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            name: 'Solana Mainnet',
            nativeCurrency:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            isEvm: false,
          },
        },
      },
    },
  },
} as unknown as RootState;

const renderComponent = (state = STATE_MOCK) =>
  renderWithProvider(<StakeButton asset={MOCK_ETH_MAINNET_ASSET} />, {
    state,
  });

describe('StakeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getVersion as jest.Mock).mockReturnValue('1.0.0');
  });

  it('renders correctly', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON)).toBeDefined();
  });

  it('navigates to Web view when stake button is pressed and user is not eligible', async () => {
    (useStakingEligibility as jest.Mock).mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      refreshPooledStakingEligibility: jest
        .fn()
        .mockResolvedValue({ isEligible: false }),
      error: false,
    });
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        params: {
          newTabUrl: `${AppConstants.STAKE.URL}?metamaskEntry=mobile`,
          timestamp: expect.any(Number),
        },
        screen: Routes.BROWSER.VIEW,
      });
    });
  });

  it('navigates to Stake Input screen when stake button is pressed and user is eligible', async () => {
    (useStakingEligibility as jest.Mock).mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      refreshPooledStakingEligibility: jest
        .fn()
        .mockResolvedValue({ isEligible: true }),
      error: false,
    });
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: {
          token: MOCK_ETH_MAINNET_ASSET,
          action: EARN_INPUT_VIEW_ACTIONS.STAKE,
        },
      });
    });
  });

  it('navigates to Stake Input screen when on unsupported network', async () => {
    // Update the mock for this specific test
    useStakingChain.mockImplementation(() => ({
      isStakingSupportedChain: false,
    }));

    const UNSUPPORTED_NETWORK_STATE = {
      engine: {
        backgroundState: {
          NetworkController: {
            ...mockNetworkState({
              chainId: '0x89', // Polygon
            }),
          },
          MultichainNetworkController: {
            isEvmSelected: true,
            selectedMultichainNetworkChainId: SolScope.Mainnet,

            multichainNetworkConfigurationsByChainId: {
              'bip122:000000000019d6689c085ae165831e93': {
                chainId: 'bip122:000000000019d6689c085ae165831e93',
                name: 'Bitcoin Mainnet',
                nativeCurrency:
                  'bip122:000000000019d6689c085ae165831e93/slip44:0',
                isEvm: false,
              },
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
                chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
                name: 'Solana Mainnet',
                nativeCurrency:
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                isEvm: false,
              },
            },
          },
        },
      },
    } as unknown as RootState;

    const spySetActiveNetwork = jest.spyOn(
      Engine.context.MultichainNetworkController,
      'setActiveNetwork',
    );
    const { getByTestId } = renderComponent(UNSUPPORTED_NETWORK_STATE);
    fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));
    await waitFor(() => {
      expect(spySetActiveNetwork).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: {
          token: MOCK_ETH_MAINNET_ASSET,
          action: EARN_INPUT_VIEW_ACTIONS.STAKE,
        },
      });
    });
  });

  it('does not render button when all earn experiences are disabled', () => {
    (selectPooledStakingEnabledFlag as unknown as jest.Mock).mockReturnValue(
      false,
    );
    (
      selectStablecoinLendingEnabledFlag as unknown as jest.Mock
    ).mockReturnValue(false);

    const { queryByTestId } = renderComponent();

    expect(queryByTestId(WalletViewSelectorsIDs.STAKE_BUTTON)).toBeNull();
  });
});
