import React from 'react';
import { stakingWithdrawalConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import { useConfirmationMetricEvents } from '../../../../hooks/useConfirmationMetricEvents';
import { getNavbar } from '../../Navbar/Navbar';
import StakingWithdrawal from './StakingWithdrawal';

jest.mock('../../../../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

jest.mock('../../../../hooks/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
}));

jest.mock('../../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../Navbar/Navbar', () => ({
  getNavbar: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

describe('StakingWithdrawal', () => {
  const mockTrackPageViewedEvent = jest.fn();
  const mockGetNavbar = jest.mocked(getNavbar);
  const mockUseConfirmActions = jest.mocked(useConfirmActions);
  const mockUseConfirmationMetricEvents = jest.mocked(
    useConfirmationMetricEvents,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmActions.mockReturnValue({
      onReject: jest.fn(),
      onConfirm: jest.fn(),
    });

    mockUseConfirmationMetricEvents.mockReturnValue({
      trackPageViewedEvent: mockTrackPageViewedEvent,
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
    });
  });

  it('tracks metrics events', () => {
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
  });
});
