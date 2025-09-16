import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { stakingWithdrawalConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { EVENT_PROVIDERS } from '../../../../../../UI/Stake/constants/events';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import { getNavbar } from '../../../../components/UI/navbar/navbar';
import StakingWithdrawal from './staking-withdrawal';
import { endTrace, TraceName } from '../../../../../../../util/trace';

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn().mockReturnValue({
    params: {
      maxValueMode: false,
    },
  }),
}));

jest.mock('../../../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('../../../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
  },
}));

// jest.mock('../../../../hooks/gas/useGasFeeToken');

jest.mock('../../../../hooks/gas/useIsGaslessSupported', () => ({
  useIsGaslessSupported: jest.fn().mockReturnValue({
    isSupported: false,
    isSmartTransaction: false,
  }),
}));

jest.mock('../../../../hooks/metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
}));

jest.mock('../../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../../../components/UI/navbar/navbar', () => ({
  getNavbar: jest.fn(),
}));

jest.mock('../../../../utils/token', () => ({
  ...jest.requireActual('../../../../utils/token'),
  fetchErc20Decimals: jest.fn().mockResolvedValue(18),
}));

jest.mock('../../../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../../../util/trace'),
  endTrace: jest.fn(),
}));

const noop = () => undefined;
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn().mockReturnValue(noop),
    }),
  };
});

describe('StakingWithdrawal', () => {
  const mockTrackPageViewedEvent = jest.fn();
  const mockSetConfirmationMetric = jest.fn();
  const mockGetNavbar = jest.mocked(getNavbar);
  const mockUseConfirmActions = jest.mocked(useConfirmActions);
  const mockUseConfirmationMetricEvents = jest.mocked(
    useConfirmationMetricEvents,
  );
  const mockEndTrace = jest.mocked(endTrace);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmActions.mockReturnValue({
      onReject: jest.fn(),
      onConfirm: jest.fn(),
    });

    mockUseConfirmationMetricEvents.mockReturnValue({
      trackPageViewedEvent: mockTrackPageViewedEvent,
      setConfirmationMetric: mockSetConfirmationMetric,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
  });

  it('renders correctly', () => {
    const mockOnReject = jest.fn();
    mockUseConfirmActions.mockImplementation(() => ({
      onConfirm: jest.fn(),
      onReject: mockOnReject,
    }));

    const { getByText } = renderWithProvider(
      <StakingWithdrawal
        route={{
          params: {
            amountWei: '1000000000000000000',
            amountFiat: '1000000000000000000',
          },
          key: 'mockRouteKey',
          name: 'params',
        }}
      />,
      {
        state: stakingWithdrawalConfirmationState,
      },
    );

    expect(getByText('Withdrawal time')).toBeDefined();

    expect(getByText('Unstaking to')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Network')).toBeDefined();

    expect(getByText('Network Fee')).toBeDefined();

    expect(mockGetNavbar).toHaveBeenCalled();
    expect(mockGetNavbar).toHaveBeenCalledWith({
      title: 'Unstake',
      onReject: mockOnReject,
      addBackButton: true,
      theme: expect.any(Object),
    });
  });

  it('tracks metrics events', async () => {
    renderWithProvider(
      <StakingWithdrawal
        route={{
          params: {
            amountWei: '1000000000000000000',
            amountFiat: '1000000000000000000',
          },
          key: 'mockRouteKey',
          name: 'params',
        }}
      />,
      {
        state: stakingWithdrawalConfirmationState,
      },
    );

    expect(mockTrackPageViewedEvent).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockSetConfirmationMetric).toHaveBeenCalledTimes(1);
      expect(mockSetConfirmationMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            transaction_amount_eth: '1',
          }),
        }),
      );
    });
  });

  it('ends the EarnWithdrawConfirmationScreen trace on mount', () => {
    renderWithProvider(
      <StakingWithdrawal
        route={{
          params: {
            amountWei: '1000000000000000000',
            amountFiat: '1000000000000000000',
          },
          key: 'mockRouteKey',
          name: 'params',
        }}
      />,
      {
        state: stakingWithdrawalConfirmationState,
      },
    );

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.EarnWithdrawConfirmationScreen,
    });
  });
});
