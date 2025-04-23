import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { cloneDeep } from 'lodash';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import { NETWORKS_CHAIN_ID } from '../../../../../../../constants/network';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import { TOOLTIP_TYPES } from '../../../../../../../core/Analytics/events/confirmations';
import GasFeesDetails from './gas-fee-details';

// --- Update Jest Mock ---
const MOCK_CHAIN_ID = stakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].chainId;
const MOCK_NETWORK_CLIENT_ID = stakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].networkClientId;

jest.mock('../../../../hooks/metrics/useConfirmationMetricEvents');
jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      getGasFeeEstimatesAndStartPolling: jest.fn().mockResolvedValue('pollToken123'),
      startPolling: jest.fn().mockResolvedValue('pollToken123'),
      stopPollingByPollingToken: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn((networkClientId) => {
        if (networkClientId === MOCK_NETWORK_CLIENT_ID) {
          return {
            chainId: MOCK_CHAIN_ID,
            rpcUrl: 'mockRpcUrl',
            ticker: 'MOCK',
            nickname: 'Mock Network',
            id: networkClientId,
          };
        }
        return undefined;
      }),
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
    expect(getByText('$0.51')).toBeDefined();
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
    expect(getByText('$0.51')).toBeDefined();
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
    expect(queryByText('$0.51')).toBeNull();
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
    expect(queryByText('$0.51')).toBeNull();
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

  it('opens the gas fee modal on press', async () => {
    const stateWithGasEstimates = cloneDeep(stakingDepositConfirmationState);
    // Ensure GasFeeController state has the necessary estimates
    stateWithGasEstimates.engine.backgroundState.GasFeeController = {
      ...stateWithGasEstimates.engine.backgroundState.GasFeeController,
      gasFeeEstimates: {
        low: { suggestedMaxFeePerGas: '10', suggestedMaxPriorityFeePerGas: '1' },
        medium: { suggestedMaxFeePerGas: '20', suggestedMaxPriorityFeePerGas: '2' }, // Add medium estimate
        high: { suggestedMaxFeePerGas: '30', suggestedMaxPriorityFeePerGas: '3' },
        estimatedBaseFee: '10',
      },
      gasEstimateType: 'fee-market',
      getGasFeeEstimatesAndStartPolling: jest.fn().mockResolvedValue('pollToken123'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { getByText } = renderWithProvider(
      <GasFeesDetails />,
      {
        state: stateWithGasEstimates, // Use the updated state
      },
    );

    // Find the TouchableOpacity that is the parent of the InfoSection, and a
    // grandparent of the AlertRow
    fireEvent.press(getByText('Network Fee').parent.parent);

    // Check if the modal title appears
    expect(getByText('Edit priority')).toBeDefined();
  });

  it('renders null if transactionMetadata is not available', async () => {
    const emptyTransactionConfirmationState = cloneDeep(stakingDepositConfirmationState);
    emptyTransactionConfirmationState.engine.backgroundState.TransactionController.transactions = [];

    const { queryByText } = renderWithProvider(<GasFeesDetails />, {
      state: emptyTransactionConfirmationState,
    });

    // Check if the component renders nothing by querying for a known element
    expect(queryByText('Network Fee')).toBeNull();
  });
});
