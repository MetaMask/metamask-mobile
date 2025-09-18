import { fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';
import React from 'react';
import { RootState } from '../../../../../../../reducers';
import { decGWEIToHexWEI } from '../../../../../../../util/conversions';
import { stakingDepositConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import { TOOLTIP_TYPES } from '../../../../../../../core/Analytics/events/confirmations';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../../util/test/renderWithProvider';
import { mockEarnControllerRootState } from '../../../../../../UI/Stake/testUtils';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import StakingDetails from './staking-details';

jest.mock('../../../../hooks/metrics/useConfirmationMetricEvents');

describe('StakingDetails', () => {
  const useConfirmationMetricEventsMock = jest.mocked(
    useConfirmationMetricEvents,
  );
  const mockTrackTooltipClickedEvent = jest.fn();
  const mockEarnControllerState =
    mockEarnControllerRootState().engine.backgroundState.EarnController;

  beforeEach(() => {
    useConfirmationMetricEventsMock.mockReturnValue({
      trackTooltipClickedEvent: mockTrackTooltipClickedEvent,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
  });

  it('contains token and fiat values for staking deposit', async () => {
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
            EarnController: mockEarnControllerState,
          },
        },
      },
    );

    const { getByText } = renderWithProvider(<StakingDetails />, { state });

    expect(getByText('APR')).toBeDefined();
    expect(getByText('3.3%')).toBeDefined();

    expect(getByText('Est. annual reward')).toBeDefined();
    expect(getByText('$11.72')).toBeDefined();
    expect(getByText('0.00326 ETH')).toBeDefined();

    expect(getByText('Reward frequency')).toBeDefined();
    expect(getByText('12 hours')).toBeDefined();

    expect(getByText('Withdrawal time')).toBeDefined();
    expect(getByText('1 to 44 days')).toBeDefined();
  });

  it('tracks tooltip clicked event', async () => {
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
            EarnController: mockEarnControllerState,
          },
        },
      },
    );

    const { getByTestId } = renderWithProvider(<StakingDetails />, { state });

    fireEvent.press(getByTestId('info-row-tooltip-open-btn'));

    expect(mockTrackTooltipClickedEvent).toHaveBeenCalled();
    expect(mockTrackTooltipClickedEvent).toHaveBeenCalledWith({
      tooltip: TOOLTIP_TYPES.REWARD_FREQUENCY,
    });
  });
});
