import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsRecoveryStatusBanner from './PerpsRecoveryStatusBanner';
import { usePerpsRecoveryStatus } from '../../hooks/usePerpsRecoveryStatus';

jest.mock('../../hooks/usePerpsRecoveryStatus', () => ({
  usePerpsRecoveryStatus: jest.fn(),
}));

const mockUsePerpsRecoveryStatus = usePerpsRecoveryStatus as jest.Mock;

const baseHookState = {
  pendingManualRecoveries: [],
  recoveredDispatches: [],
  isLoading: false,
  error: null,
  refresh: jest.fn(),
  acknowledge: jest.fn().mockResolvedValue(undefined),
};

describe('PerpsRecoveryStatusBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when there is no pending recovery state', () => {
    mockUsePerpsRecoveryStatus.mockReturnValue({ ...baseHookState });

    const { queryByTestId } = render(<PerpsRecoveryStatusBanner />);

    expect(queryByTestId('perps-recovery-status-banner-dispatch')).toBeNull();
    expect(queryByTestId('perps-recovery-status-banner-manual')).toBeNull();
  });

  it('shows a recovered dispatch and acknowledges it by stable id', async () => {
    const acknowledge = jest.fn().mockResolvedValue(undefined);
    mockUsePerpsRecoveryStatus.mockReturnValue({
      ...baseHookState,
      acknowledge,
      recoveredDispatches: [
        {
          recoveryId: '42:abcd',
          kind: 13,
          intent: 'withdraw:25',
          txHash: 'abcd',
          outcome: 'succeeded',
          evidence: 'tx-status:3',
        },
      ],
    });

    const { getByTestId, getByText } = render(<PerpsRecoveryStatusBanner />);

    expect(getByTestId('perps-recovery-status-banner-dispatch')).toBeTruthy();
    fireEvent.press(getByText('Acknowledge'));
    await waitFor(() => {
      expect(acknowledge).toHaveBeenCalledWith('42:abcd');
    });
  });

  it('shows a manual-recovery warning for the affected symbol', () => {
    mockUsePerpsRecoveryStatus.mockReturnValue({
      ...baseHookState,
      pendingManualRecoveries: [
        {
          symbol: 'BTC',
          settlementKey: '0xabc:28:7:BTC',
          recordedAt: 5,
          reason: 'why',
          priorIntent: 'replace',
          survivingOrderIds: [],
          actionNeeded: 'set a new TP/SL',
        },
      ],
    });

    const { getByTestId } = render(<PerpsRecoveryStatusBanner />);

    expect(getByTestId('perps-recovery-status-banner-manual')).toBeTruthy();
  });

  it('renders hook read errors instead of returning null', () => {
    mockUsePerpsRecoveryStatus.mockReturnValue({
      ...baseHookState,
      error: new Error('Lighter TP/SL manual-recovery index is corrupt'),
    });

    const { getByTestId, getByText } = render(<PerpsRecoveryStatusBanner />);

    expect(getByTestId('perps-recovery-status-banner-error')).toBeTruthy();
    expect(
      getByText('Lighter TP/SL manual-recovery index is corrupt'),
    ).toBeTruthy();
  });

  it('keeps the dispatch banner actionable when acknowledgment fails', async () => {
    const acknowledge = jest
      .fn()
      .mockRejectedValue(new Error('No pending recovered'));
    mockUsePerpsRecoveryStatus.mockReturnValue({
      ...baseHookState,
      acknowledge,
      error: new Error('No pending recovered'),
      recoveredDispatches: [
        {
          recoveryId: '42:abcd',
          kind: 13,
          intent: 'withdraw:25',
          txHash: 'abcd',
          outcome: 'succeeded',
          evidence: 'tx-status:3',
        },
      ],
    });

    const { getByTestId, getByText } = render(<PerpsRecoveryStatusBanner />);

    // Both the failure and the still-actionable acknowledge action render.
    expect(getByTestId('perps-recovery-status-banner-error')).toBeTruthy();
    expect(getByTestId('perps-recovery-status-banner-dispatch')).toBeTruthy();
    fireEvent.press(getByText('Acknowledge'));
    await waitFor(() => {
      expect(acknowledge).toHaveBeenCalledWith('42:abcd');
    });
  });
});
