import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import { EVENT_LOCATIONS as STAKING_EVENT_LOCATIONS } from '../../../../../../UI/Stake/constants/events';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import { useConfirmationMetricEvents } from '../../../../hooks/useConfirmationMetricEvents';
import { getNavbar } from '../../Navbar/Navbar';
import StakingDeposit from './StakingDeposit';

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

jest.mock('../../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../Navbar/Navbar', () => ({
  getNavbar: jest.fn(),
}));

jest.mock('../../../../hooks/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
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

describe('StakingDeposit', () => {
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

  it('should render correctly', () => {
    const mockOnReject = jest.fn();
    mockUseConfirmActions.mockImplementation(() => ({
      onConfirm: jest.fn(),
      onReject: mockOnReject,
    }));

    const { getByText } = renderWithProvider(<StakingDeposit />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByText('APR')).toBeDefined();
    expect(getByText('Est. annual reward')).toBeDefined();
    expect(getByText('Reward frequency')).toBeDefined();
    expect(getByText('Withdrawal time')).toBeDefined();
    expect(getByText('Network Fee')).toBeDefined();
    expect(getByText('Advanced details')).toBeDefined();

    expect(mockGetNavbar).toHaveBeenCalled();
    expect(mockGetNavbar).toHaveBeenCalledWith({
      title: 'Stake',
      onReject: mockOnReject,
    });

    expect(mockTrackPageViewedEvent).toHaveBeenCalled();
    expect(mockTrackPageViewedEvent).toHaveBeenCalledWith({
      location: STAKING_EVENT_LOCATIONS.REDESIGNED_STAKE_CONFIRMATION_VIEW,
    });
  });
});
