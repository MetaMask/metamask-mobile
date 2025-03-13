import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { cloneDeep } from 'lodash';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import { NETWORKS_CHAIN_ID } from '../../../../../../../constants/network';
import { useConfirmationMetricEvents } from '../../../../hooks/useConfirmationMetricEvents';
import { TOOLTIP_TYPES } from '../../../../../../../core/Analytics/events/confirmations';
import GasFeesDetails from './GasFeesDetails';

jest.mock('../../../../hooks/useConfirmationMetricEvents');
jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
  },
}));

describe('GasFeesDetails', () => {
  const useConfirmationMetricEventsMock = jest.mocked(
    useConfirmationMetricEvents,
  );
  const mockTrackTooltipClickedEvent = jest.fn();

  beforeEach(() => {
    useConfirmationMetricEventsMock.mockReturnValue({
      trackTooltipClickedEvent: mockTrackTooltipClickedEvent,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
  });

  it('contains required text', async () => {
    const { getByText } = renderWithProvider(<GasFeesDetails />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByText('Network Fee')).toBeDefined();
    expect(getByText('$0.34')).toBeDefined();
    expect(getByText('0.0001 ETH')).toBeDefined();
  });

  it('shows fiat if showFiatOnTestnets is true', async () => {
    const clonedStakingDepositConfirmationState = cloneDeep(
      stakingDepositConfirmationState,
    );
    clonedStakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].chainId =
      NETWORKS_CHAIN_ID.SEPOLIA;

    const { getByText } = renderWithProvider(<GasFeesDetails />, {
      state: clonedStakingDepositConfirmationState,
    });
    expect(getByText('$0.34')).toBeDefined();
  });

  it('hides fiat if showFiatOnTestnets is false', async () => {
    const clonedStakingDepositConfirmationState = cloneDeep(
      stakingDepositConfirmationState,
    );
    clonedStakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].chainId =
      NETWORKS_CHAIN_ID.SEPOLIA;
    clonedStakingDepositConfirmationState.settings.showFiatOnTestnets = false;

    const { queryByText } = renderWithProvider(<GasFeesDetails />, {
      state: clonedStakingDepositConfirmationState,
    });
    expect(queryByText('$0.34')).toBeNull();
  });

  it('hides fiat if nativeConversionRate is undefined', async () => {
    const clonedStakingDepositConfirmationState = cloneDeep(
      stakingDepositConfirmationState,
    );

    // No type is exported for CurrencyRate, so we need to cast it to the correct type
    clonedStakingDepositConfirmationState.engine.backgroundState.CurrencyRateController.currencyRates.ETH =
      null as unknown as {
        conversionDate: number;
        conversionRate: number;
        usdConversionRate: number;
      };

    const { queryByText } = renderWithProvider(<GasFeesDetails />, {
      state: clonedStakingDepositConfirmationState,
    });
    expect(queryByText('$0.34')).toBeNull();
  });

  it('tracks tooltip clicked event', async () => {
    const { getByTestId } = renderWithProvider(<GasFeesDetails />, {
      state: stakingDepositConfirmationState,
    });

    fireEvent.press(getByTestId('info-row-tooltip-open-btn'));

    expect(mockTrackTooltipClickedEvent).toHaveBeenCalled();
    expect(mockTrackTooltipClickedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tooltip: TOOLTIP_TYPES.NETWORK_FEE,
      }),
    );
  });
});
