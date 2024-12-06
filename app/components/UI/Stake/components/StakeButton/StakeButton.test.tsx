import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import StakeButton from './index';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MOCK_STAKED_ETH_ASSET } from '../../__mocks__/mockData';
import { useMetrics } from '../../../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { mockNetworkState } from '../../../../../util/test/network';

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

jest.mock('../../constants', () => ({
  isPooledStakingFeatureEnabled: jest.fn().mockReturnValue(true),
}));

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
  },
}));

jest.mock('../../hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: () => ({
    isEligible: true,
    loading: false,
    error: null,
    refreshPooledStakingEligibility: jest
      .fn()
      .mockResolvedValueOnce({ isEligible: true }),
  }),
}));

const STATE_MOCK = {
  engine: {
    backgroundState: {
      NetworkController: {
        ...mockNetworkState({
          chainId: '0x1',
        }),
      },
    },
  },
};

const renderComponent = () =>
  renderWithProvider(<StakeButton asset={MOCK_STAKED_ETH_ASSET} />, {
    state: STATE_MOCK,
  });

describe('StakeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON)).toBeDefined();
  });

  it('navigates to Stake Input screen when stake button is pressed and user is eligible', async () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.STAKE_BUTTON));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.STAKE,
      });
    });
  });
});
