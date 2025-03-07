import { fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';
import React from 'react';
import { RootState } from '../../../../../../reducers';
import { decGWEIToHexWEI } from '../../../../../../util/conversions';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import { EVENT_LOCATIONS as STAKING_EVENT_LOCATIONS } from '../../../../../UI/Stake/constants/events';
import { TOOLTIP_TYPES as STAKING_TOOLTIP_TYPES } from '../../../constants/metricEvents';
import { useConfirmationMetricEvents } from '../../../hooks/useConfirmationMetricEvents';
import StakingDetails from './StakingDetails';

jest.mock('../../../hooks/useConfirmationMetricEvents');

const state: DeepPartial<RootState> = merge(
  {},
  stakingDepositConfirmationState,
  {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [
            {
              txParams: { value: `0x${decGWEIToHexWEI(10 ** 8)}` },
            },
          ],
        },
      },
    },
    staking: {
      vaultData: { apy: '2.2' },
    },
  },
);

describe('StakingDetails', () => {
  const useConfirmationMetricEventsMock = jest.mocked(
    useConfirmationMetricEvents,
  );
  const mockTrackTooltipClickedEvent = jest.fn();

  beforeEach(() => {
    useConfirmationMetricEventsMock.mockReturnValue({
      trackTooltipClickedEvent: mockTrackTooltipClickedEvent,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
  });

  it('contains token and fiat values for staking deposit', async () => {
    const { getByText } = renderWithProvider(<StakingDetails />, { state });

    expect(getByText('APR')).toBeDefined();
    expect(getByText('2.2%')).toBeDefined();

    expect(getByText('Est. annual reward')).toBeDefined();
    expect(getByText('$7.91')).toBeDefined();
    expect(getByText('0.0022 ETH')).toBeDefined();

    expect(getByText('Reward frequency')).toBeDefined();
    expect(getByText('12 hours')).toBeDefined();

    expect(getByText('Withdrawal time')).toBeDefined();
    expect(getByText('1 to 11 days')).toBeDefined();
  });

  it('tracks tooltip clicked event', async () => {
    const { getByTestId } = renderWithProvider(<StakingDetails />, { state });

    fireEvent.press(getByTestId('info-row-tooltip-open-btn'));

    expect(mockTrackTooltipClickedEvent).toHaveBeenCalled();
    expect(mockTrackTooltipClickedEvent).toHaveBeenCalledWith({
      location: STAKING_EVENT_LOCATIONS.REDESIGNED_STAKE_CONFIRMATION_VIEW,
      tooltip: STAKING_TOOLTIP_TYPES.REWARD_FREQUENCY,
    });
  });
});
