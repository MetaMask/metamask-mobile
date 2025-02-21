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
import Engine from '../../../../../core/Engine';
import { STAKE_INPUT_VIEW_ACTIONS } from '../../Views/StakeInputView/StakeInputView.types';
// eslint-disable-next-line import/no-namespace
import * as useStakingEligibility from '../../hooks/useStakingEligibility';

const mockNavigate = jest.fn();

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
      EarnController: {
        pooled_staking: {
          isEligible: true,
        },
      },
    },
  },
};

const renderComponent = (state = STATE_MOCK) =>
  renderWithProvider(<StakeButton asset={MOCK_ETH_MAINNET_ASSET} />, {
    state,
  });

describe('StakeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(useStakingEligibility, 'default').mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      error: '',
      refreshPooledStakingEligibility: jest.fn(),
    });
  });

  it('renders correctly', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON)).toBeDefined();
  });

  it('navigates to Web view when stake button is pressed and user is not eligible', async () => {
    jest.spyOn(useStakingEligibility, 'default').mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: '',
      refreshPooledStakingEligibility: jest.fn(),
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
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: {
          token: MOCK_ETH_MAINNET_ASSET,
          action: STAKE_INPUT_VIEW_ACTIONS.STAKE,
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
          EarnController: {
            pooled_staking: {
              isEligible: true,
            },
          },
        },
      },
    };
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
          action: STAKE_INPUT_VIEW_ACTIONS.STAKE,
        },
      });
    });
  });
});
