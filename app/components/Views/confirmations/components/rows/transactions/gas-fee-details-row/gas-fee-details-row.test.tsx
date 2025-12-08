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
import { SimulationData } from '@metamask/transaction-controller';
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
});
