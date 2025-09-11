import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import { EVENT_PROVIDERS } from '../../../../../../UI/Stake/constants/events';
import { useConfirmActions } from '../../../../hooks/useConfirmActions';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import { getNavbar } from '../../../../components/UI/navbar/navbar';
import { endTrace, TraceName } from '../../../../../../../util/trace';
import StakingDeposit from './staking-deposit';

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

jest.mock('../../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../../../components/UI/navbar/navbar', () => ({
  getNavbar: jest.fn(),
}));

jest.mock('../../../../hooks/metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
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

describe('StakingDeposit', () => {
  const mockTrackPageViewedEvent = jest.fn();
  const mockTrackAdvancedDetailsToggledEvent = jest.fn();
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
      trackAdvancedDetailsToggledEvent: mockTrackAdvancedDetailsToggledEvent,
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
      addBackButton: true,
      theme: expect.any(Object),
    });
  });

  it('tracks metrics events', async () => {
    const { getByText } = renderWithProvider(<StakingDeposit />, {
      state: stakingDepositConfirmationState,
    });

    expect(mockTrackPageViewedEvent).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      // 2 calls here, 1st call is for the setting transaction_amount_eth
      // 2nd call is for the setting advanced_details_viewed
      expect(mockSetConfirmationMetric).toHaveBeenCalledTimes(2);
      expect(mockSetConfirmationMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            transaction_amount_eth: '0.0001',
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
          }),
        }),
      );
      expect(mockSetConfirmationMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            advanced_details_viewed: false,
          }),
        }),
      );
    });

    fireEvent.press(getByText('Advanced details'));
    expect(mockTrackAdvancedDetailsToggledEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackAdvancedDetailsToggledEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        isExpanded: true,
      }),
    );

    // Last call is for the advanced details view
    expect(mockSetConfirmationMetric).toHaveBeenCalledTimes(3);
    expect(mockSetConfirmationMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          advanced_details_viewed: true,
        }),
      }),
    );

    fireEvent.press(getByText('Advanced details'));

    // Collapse toggle should not set advanced_details_viewed
    expect(mockSetConfirmationMetric).toHaveBeenCalledTimes(3);
  });

  it('ends the EarnDepositConfirmationScreen trace on mount', () => {
    renderWithProvider(<StakingDeposit />, {
      state: stakingDepositConfirmationState,
    });

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.EarnDepositConfirmationScreen,
    });
  });
});
