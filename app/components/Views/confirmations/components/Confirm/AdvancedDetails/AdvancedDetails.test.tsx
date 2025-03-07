import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useConfirmationMetricEvents } from '../../../hooks/useConfirmationMetricEvents';
import AdvancedDetails from './AdvancedDetails';

jest.mock('../../../hooks/useConfirmationMetricEvents');

const mockLocation = 'staking_deposit_confirmation';

describe('AdvancedDetails', () => {
  const useConfirmationMetricEventsMock = jest.mocked(
    useConfirmationMetricEvents,
  );
  const mocktrackAdvancedDetailsToggledEvent = jest.fn();

  beforeEach(() => {
    useConfirmationMetricEventsMock.mockReturnValue({
      trackAdvancedDetailsToggledEvent: mocktrackAdvancedDetailsToggledEvent,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
  });

  it('contains values for staking deposit', async () => {
    const { getByText } = renderWithProvider(
      <AdvancedDetails location={mockLocation} />,
      {
        state: stakingDepositConfirmationState,
      },
    );

    expect(getByText('Advanced details')).toBeDefined();

    fireEvent(getByText('Advanced details'), 'onPress');

    expect(getByText('Advanced details')).toBeDefined();

    expect(getByText('Staking from')).toBeDefined();
    expect(getByText('0xDc477...0c164')).toBeDefined();

    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Pooled Staking')).toBeDefined();

    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();

    expect(mocktrackAdvancedDetailsToggledEvent).toHaveBeenCalled();
    expect(mocktrackAdvancedDetailsToggledEvent).toHaveBeenCalledWith({
      location: mockLocation,
    });
  });
});
