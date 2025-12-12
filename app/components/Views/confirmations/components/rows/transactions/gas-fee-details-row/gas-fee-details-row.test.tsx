import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { cloneDeep } from 'lodash';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import { NETWORKS_CHAIN_ID } from '../../../../../../../constants/network';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import { TOOLTIP_TYPES } from '../../../../../../../core/Analytics/events/confirmations';
import GasFeesDetailsRow from './gas-fee-details-row';
import { toHex } from '@metamask/controller-utils';
import {
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  SimulationData,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { useSelectedGasFeeToken } from '../../../../hooks/gas/useGasFeeToken';
import { useIsGaslessSupported } from '../../../../hooks/gas/useIsGaslessSupported';
import { useInsufficientBalanceAlert } from '../../../../hooks/alerts/useInsufficientBalanceAlert';
import useHideFiatForTestnet from '../../../../../../hooks/useHideFiatForTestnet';
import useBalanceChanges from '../../../../../../UI/SimulationDetails/useBalanceChanges';

jest.mock('../../../gas/gas-speed', () => ({
  GasSpeed: () => null,
}));
jest.mock('../../../../hooks/metrics/useConfirmationMetricEvents');
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
jest.mock('../../../../hooks/gas/useGasFeeToken');
jest.mock('../../../../hooks/gas/useIsGaslessSupported');
jest.mock('../../../../hooks/alerts/useInsufficientBalanceAlert');
jest.mock('../../../../../../hooks/useHideFiatForTestnet');
jest.mock('../../../../hooks/tokens/useTokenWithBalance');
jest.mock('../../../../../../UI/SimulationDetails/useBalanceChanges');

const GAS_FEE_TOKEN_MOCK: ReturnType<typeof useSelectedGasFeeToken> = {
  amount: toHex(10000),
  amountFormatted: '10,000',
  amountFiat: '$0.34',
  balance: toHex(12345),
  balanceFiat: '$0.42',
  decimals: 18,
  gas: '0x1',
  gasTransfer: '0x2a',
  maxFeePerGas: '0x3',
  maxPriorityFeePerGas: '0x4',
  rateWei: toHex('2000000000000000000'),
  recipient: '0x1234567890123456789012345678901234567892',
  symbol: 'USDC',
  tokenAddress: '0x1234567890123456789012345678901234567893',
  metaMaskFee: '0x0',
  metamaskFeeFiat: '$0.00',
  fee: '0x0',
  transferTransaction: {},
};

const SIMULATION_DATA_MOCK: SimulationData = {
  nativeBalanceChange: {
    previousBalance: '0x0',
    newBalance: '0x0',
    difference: '0x0',
    isDecrease: false,
  },
  tokenBalanceChanges: [],
};

const createStateWithSimulationData = (
  baseState = stakingDepositConfirmationState,
) => {
  const stateWithSimulation = cloneDeep(baseState);
  const transactions =
    stateWithSimulation.engine.backgroundState.TransactionController
      .transactions;

  if (transactions?.[0]) {
    transactions[0].simulationData = cloneDeep(SIMULATION_DATA_MOCK);
  }

  return stateWithSimulation;
};

const createStateWithBatchTransaction = (
  baseState = stakingDepositConfirmationState,
) => {
  const stateWithBatch = cloneDeep(baseState);
  const batchId = 'test-batch-id';

  // Add batch metadata
  stateWithBatch.engine.backgroundState.TransactionController.transactionBatches =
    [
      {
        id: batchId,
        chainId: '0x1',
        from: '0x1234567890123456789012345678901234567890',
        networkClientId: 'mainnet',
        gas: '0x5208',
        gasFeeEstimates: {
          type: GasFeeEstimateType.FeeMarket,
          [GasFeeEstimateLevel.Low]: {
            maxFeePerGas: '0x59682f00',
            maxPriorityFeePerGas: '0x59682f00',
          },
          [GasFeeEstimateLevel.Medium]: {
            maxFeePerGas: '0x59682f00',
            maxPriorityFeePerGas: '0x59682f00',
          },
          [GasFeeEstimateLevel.High]: {
            maxFeePerGas: '0x59682f00',
            maxPriorityFeePerGas: '0x59682f00',
          },
        },
        status: TransactionStatus.unapproved,
        transactions: [],
      },
    ];

  // Create approval for the batch
  // @ts-expect-error Adding dynamic batch approval to test state
  stateWithBatch.engine.backgroundState.ApprovalController.pendingApprovals[
    batchId
  ] = {
    id: batchId,
    type: 'transaction_batch',
    time: Date.now(),
    origin: 'metamask',
    requestData: { txBatchId: batchId },
  };
  stateWithBatch.engine.backgroundState.ApprovalController.pendingApprovalCount = 2;

  return stateWithBatch;
};

describe('GasFeesDetailsRow', () => {
  const useConfirmationMetricEventsMock = jest.mocked(
    useConfirmationMetricEvents,
  );
  const mockTrackTooltipClickedEvent = jest.fn();
  const mockUseSelectedGasFeeToken = jest.mocked(useSelectedGasFeeToken);
  const mockUseIsGaslessSupported = jest.mocked(useIsGaslessSupported);
  const mockUseInsufficientBalanceAlert = jest.mocked(
    useInsufficientBalanceAlert,
  );
  const mockUseHideFiatForTestnet = jest.mocked(useHideFiatForTestnet);
  const mockUseBalanceChanges = jest.mocked(useBalanceChanges);

  beforeEach(() => {
    useConfirmationMetricEventsMock.mockReturnValue({
      trackTooltipClickedEvent: mockTrackTooltipClickedEvent,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
    mockUseSelectedGasFeeToken.mockReturnValue(undefined);
    mockUseIsGaslessSupported.mockReturnValue({
      isSupported: true,
      isSmartTransaction: false,
      pending: false,
    });
    mockUseInsufficientBalanceAlert.mockReturnValue([]);
    mockUseHideFiatForTestnet.mockReturnValue(false);
    mockUseBalanceChanges.mockReturnValue({
      pending: false,
      value: [],
    });
  });

  it('contains required text', async () => {
    const { getByText } = renderWithProvider(<GasFeesDetailsRow />, {
      state: createStateWithSimulationData(),
    });
    expect(getByText('Network fee')).toBeDefined();
    expect(getByText('$0.34')).toBeDefined();
    expect(getByText('ETH')).toBeDefined();
  });

  it('shows fiat if showFiatOnTestnets is true', async () => {
    const clonedStakingDepositConfirmationState =
      createStateWithSimulationData();
    clonedStakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].chainId =
      NETWORKS_CHAIN_ID.SEPOLIA;

    const { getByText } = renderWithProvider(<GasFeesDetailsRow />, {
      state: clonedStakingDepositConfirmationState,
    });
    expect(getByText('$0.34')).toBeDefined();
  });

  it('hides fiat if showFiatOnTestnets is false', async () => {
    const clonedStakingDepositConfirmationState =
      createStateWithSimulationData();
    clonedStakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].chainId =
      NETWORKS_CHAIN_ID.SEPOLIA;
    clonedStakingDepositConfirmationState.settings.showFiatOnTestnets = false;

    const { queryByText } = renderWithProvider(<GasFeesDetailsRow />, {
      state: clonedStakingDepositConfirmationState,
    });
    expect(queryByText('$0.34')).toBeNull();
  });

  it('hides fiat if nativeConversionRate is undefined', async () => {
    const clonedStakingDepositConfirmationState =
      createStateWithSimulationData();

    // No type is exported for CurrencyRate, so we need to cast it to the correct type
    clonedStakingDepositConfirmationState.engine.backgroundState.CurrencyRateController.currencyRates.ETH =
      null as unknown as {
        conversionDate: number;
        conversionRate: number;
        usdConversionRate: number;
      };

    const { queryByText } = renderWithProvider(<GasFeesDetailsRow />, {
      state: clonedStakingDepositConfirmationState,
    });
    expect(queryByText('$0.34')).toBeNull();
  });

  it('tracks tooltip clicked event', async () => {
    const { getByTestId } = renderWithProvider(<GasFeesDetailsRow />, {
      state: createStateWithSimulationData(),
    });

    fireEvent.press(getByTestId('info-row-tooltip-open-btn'));

    expect(mockTrackTooltipClickedEvent).toHaveBeenCalled();
    expect(mockTrackTooltipClickedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tooltip: TOOLTIP_TYPES.NETWORK_FEE,
      }),
    );
  });

  it('shows gas speed row', async () => {
    const { getByText } = renderWithProvider(<GasFeesDetailsRow />, {
      state: createStateWithSimulationData(),
    });
    expect(getByText('Speed')).toBeDefined();
  });

  it('hide gas speed row if disabled', async () => {
    const { queryByText } = renderWithProvider(
      <GasFeesDetailsRow hideSpeed />,
      {
        state: createStateWithSimulationData(),
      },
    );

    expect(queryByText('Speed')).toBeNull();
  });

  it('shows fiat only if specified', async () => {
    const { getByText, queryByText } = renderWithProvider(
      <GasFeesDetailsRow fiatOnly />,
      {
        state: createStateWithSimulationData(),
      },
    );

    expect(getByText('$0.34')).toBeDefined();
    expect(queryByText('0.0001 ETH')).toBeNull();
  });

  it('shows selected gas fee token', async () => {
    mockUseSelectedGasFeeToken.mockReturnValue(
      GAS_FEE_TOKEN_MOCK as unknown as ReturnType<
        typeof useSelectedGasFeeToken
      >,
    );
    const { getByText } = renderWithProvider(<GasFeesDetailsRow />, {
      state: createStateWithSimulationData(),
    });

    expect(getByText('USDC')).toBeDefined();
    expect(getByText('$0.34')).toBeDefined();
  });

  it('shows native amount when is a testnet', async () => {
    mockUseHideFiatForTestnet.mockReturnValue(true);
    const clonedStakingDepositConfirmationState =
      createStateWithSimulationData();
    clonedStakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].chainId =
      NETWORKS_CHAIN_ID.SEPOLIA;

    const { getByText } = renderWithProvider(<GasFeesDetailsRow />, {
      state: clonedStakingDepositConfirmationState,
    });

    expect(getByText('0.0001')).toBeDefined();
    expect(getByText('ETH')).toBeDefined();
  });

  it(`shows 'Paid by MetaMask' when gas is sponsored`, async () => {
    const clonedStakingDepositConfirmationState =
      createStateWithSimulationData();
    clonedStakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].isGasFeeSponsored = true;
    const { getByText, queryByText } = renderWithProvider(
      <GasFeesDetailsRow />,
      {
        state: clonedStakingDepositConfirmationState,
      },
    );

    expect(getByText('Paid by MetaMask')).toBeDefined();
    expect(queryByText('ETH')).toBeNull();
  });

  it('does not show MetaMask fee info when metaMaskFee is 0x0', () => {
    const mockToken = {
      ...GAS_FEE_TOKEN_MOCK,
      metaMaskFee: '0x0',
      metamaskFeeFiat: '$0.12',
    };

    mockUseSelectedGasFeeToken.mockReturnValue(
      mockToken as unknown as ReturnType<typeof useSelectedGasFeeToken>,
    );

    const { queryByText } = renderWithProvider(<GasFeesDetailsRow />, {
      state: createStateWithSimulationData(),
    });

    expect(queryByText('MetaMask fee: $0.12')).toBeNull();
  });

  it('shows MetaMask fee info when metaMaskFee is higher than 0x0', () => {
    const mockToken = {
      ...GAS_FEE_TOKEN_MOCK,
      metaMaskFee: '0x2',
      metamaskFeeFiat: '$0.25',
    };

    mockUseSelectedGasFeeToken.mockReturnValue(
      mockToken as unknown as ReturnType<typeof useSelectedGasFeeToken>,
    );

    const { getByTestId, getByText } = renderWithProvider(
      <GasFeesDetailsRow />,
      {
        state: createStateWithSimulationData(),
      },
    );

    fireEvent.press(getByTestId('info-row-tooltip-open-btn'));

    expect(mockTrackTooltipClickedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tooltip: TOOLTIP_TYPES.NETWORK_FEE,
      }),
    );
    expect(getByText('Includes $0.25 fee')).toBeDefined();
  });

  describe('Batch Transactions', () => {
    it('displays gas fee for batch transaction with fee estimates', () => {
      mockUseSelectedGasFeeToken.mockReturnValue(GAS_FEE_TOKEN_MOCK);

      const { getByText, getByTestId } = renderWithProvider(
        <GasFeesDetailsRow />,
        {
          state: createStateWithBatchTransaction(),
        },
      );

      expect(getByText('Network fee')).toBeDefined();
      expect(getByTestId('gas-fees-details')).toBeOnTheScreen();
      // Batch transaction renders even without simulationData when fee estimates exist
    });

    it('shows loading skeleton for batch without fee calculations', () => {
      const stateWithBatch = createStateWithBatchTransaction();
      // Remove gas fee estimates to simulate loading state
      stateWithBatch.engine.backgroundState.TransactionController.transactionBatches[0].gasFeeEstimates =
        undefined;

      const { getByTestId } = renderWithProvider(<GasFeesDetailsRow />, {
        state: stateWithBatch,
      });

      // Should show skeleton when fee calculations are not ready
      expect(getByTestId('gas-fees-details')).toBeOnTheScreen();
    });

    it('does not require simulationData for batch transactions', () => {
      // This test verifies that batches don't need simulationData to display fees
      const stateWithBatch = createStateWithBatchTransaction();

      // Ensure no simulationData exists (batches don't have it)
      expect(
        stateWithBatch.engine.backgroundState.TransactionController
          .transactions?.[0]?.simulationData,
      ).toBeUndefined();

      const { getByText } = renderWithProvider(<GasFeesDetailsRow />, {
        state: stateWithBatch,
      });

      // Should still display network fee without simulationData
      expect(getByText('Network fee')).toBeDefined();
    });

    it('uses different loading logic for batch vs single transactions', () => {
      // Single transaction without simulationData should show loading
      const stateWithoutSim = cloneDeep(stakingDepositConfirmationState);
      stateWithoutSim.engine.backgroundState.TransactionController.transactions[0].simulationData =
        undefined;

      // Batch transaction without simulationData but with fee estimates should NOT show loading
      const batchState = createStateWithBatchTransaction();

      // Single transaction without simulationData should show loading
      const { getByTestId: getByTestIdSingle } = renderWithProvider(
        <GasFeesDetailsRow />,
        {
          state: stateWithoutSim,
        },
      );

      expect(getByTestIdSingle('gas-fees-details')).toBeOnTheScreen();

      // Batch transaction without simulationData but with fee estimates should still render
      const { getByTestId: getByTestIdBatch } = renderWithProvider(
        <GasFeesDetailsRow />,
        {
          state: batchState,
        },
      );

      expect(getByTestIdBatch('gas-fees-details')).toBeOnTheScreen();
    });
  });
});
