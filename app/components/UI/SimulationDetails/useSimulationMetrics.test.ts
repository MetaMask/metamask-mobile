import { useEffect, useState } from 'react';
import {
  SimulationData,
  SimulationErrorCode,
} from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { renderHook } from '@testing-library/react-hooks';
import { useDispatch } from 'react-redux';

import { updateTransactionMetrics } from '../../../core/redux/slices/transactionMetrics';
import { useMetrics } from '../../../components/hooks/useMetrics';

import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  useDisplayNames,
  DisplayNameVariant,
} from '../../hooks/DisplayName/useDisplayName';
import { BalanceChange, AssetType } from './types';
import {
  FiatType,
  UseSimulationMetricsProps,
  useSimulationMetrics,
} from './useSimulationMetrics';
import useLoadingTime from './useLoadingTime';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: jest.fn(),
  useState: jest.fn(),
}));

jest.mock('./useLoadingTime');
jest.mock('../../hooks/DisplayName/useDisplayName');
jest.mock('../../../core/redux/slices/transactionMetrics');
jest.mock('../../../components/hooks/useMetrics');

const TRANSACTION_ID_MOCK = 'testTransactionId';
const LOADING_TIME_MOCK = 0.123;
const ADDRESS_MOCK = '0x123';
const SYMBOL_MOCK = 'TST';

const BALANCE_CHANGE_MOCK = {
  asset: { address: ADDRESS_MOCK, type: AssetType.ERC20 },
  amount: new BigNumber(-1),
  fiatAmount: 1.23,
} as unknown as BalanceChange;

const DISPLAY_NAME_UNKNOWN_MOCK = {
  name: null,
  variant: DisplayNameVariant.Unknown,
};

const DISPLAY_NAME_SAVED_MOCK = {
  name: 'testName',
  contractDisplayName: SYMBOL_MOCK,
  variant: DisplayNameVariant.Recognized,
};

describe('useSimulationMetrics', () => {
  const updateTransactionMetricsMock = jest.mocked(updateTransactionMetrics);

  const useDispatchMock = jest.mocked(useDispatch);
  const useStateMock = jest.mocked(useState);
  const useEffectMock = jest.mocked(useEffect);
  const useDisplayNamesMock = jest.mocked(useDisplayNames);
  const useLoadingTimeMock = jest.mocked(useLoadingTime);
  const useMetricsMock = jest.mocked(useMetrics);
  const setLoadingCompleteMock = jest.fn();

  // TODO: Replace `any` with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let trackEventMock: jest.MockedFunction<any>;

  function expectUpdateTransactionMetricsCalled(
    {
      balanceChanges,
      simulationData,
    }: {
      balanceChanges?: BalanceChange[];
      simulationData?: SimulationData | undefined;
    },
    // TODO: Replace `any` with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expectedParams: any,
  ) {
    // It expects that the function name start with the word `use` hence we disable it
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSimulationMetrics({
      enableMetrics: true,
      balanceChanges: balanceChanges ?? [],
      simulationData,
      loading: false,
      transactionId: TRANSACTION_ID_MOCK,
    });

    expect(updateTransactionMetricsMock).toHaveBeenCalledTimes(1);
    expect(updateTransactionMetricsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: TRANSACTION_ID_MOCK,
        params: expectedParams,
      }),
    );
  }

  beforeEach(() => {
    jest.resetAllMocks();

    trackEventMock = jest.fn();

    // TODO: Replace `any` with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useStateMock.mockImplementation(((initialValue: any) => [
      initialValue,
      jest.fn(),
      // TODO: Replace `any` with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]) as any);

    useDispatchMock.mockReturnValue(jest.fn());
    useEffectMock.mockImplementation((fn) => fn());
    useDisplayNamesMock.mockReturnValue([DISPLAY_NAME_UNKNOWN_MOCK]);
    useLoadingTimeMock.mockReturnValue({
      loadingTime: LOADING_TIME_MOCK,
      setLoadingComplete: setLoadingCompleteMock,
    });
    // TODO: Replace `any` with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useMetricsMock.mockReturnValue({ trackEvent: trackEventMock } as any);
  });

  describe('updates transaction simulation metrics', () => {
    it('with loading time', async () => {
      const props = {
        balanceChanges: [BALANCE_CHANGE_MOCK],
        loading: false,
        simulationData: { tokenBalanceChanges: [] } as SimulationData,
        transactionId: TRANSACTION_ID_MOCK,
        enableMetrics: true,
      };

      renderHook((p: UseSimulationMetricsProps) => useSimulationMetrics(p), {
        initialProps: props,
      });

      expect(setLoadingCompleteMock).toHaveBeenCalledTimes(1);
      expect(updateTransactionMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: TRANSACTION_ID_MOCK,
          params: expect.objectContaining({
            properties: expect.objectContaining({
              simulation_latency: LOADING_TIME_MOCK,
            }),
          }),
        }),
      );
      jest.restoreAllMocks();
    });

    it.each([
      ['in progress', undefined, 'simulation_in_progress'],
      [
        'reverted',
        { error: { code: SimulationErrorCode.Reverted } },
        'transaction_revert',
      ],
      ['failed', { error: { message: 'testError' } }, 'failed'],
      ['no changes', { tokenBalanceChanges: [] }, 'no_balance_change'],
      ['changes', { tokenBalanceChanges: [{}] }, 'balance_change'],
    ])(
      'with simulation response if %s',
      (_, simulationData, simulationResponse) => {
        useDisplayNamesMock.mockReset();
        useDisplayNamesMock.mockReturnValue([]);

        expectUpdateTransactionMetricsCalled(
          {
            simulationData: simulationData as SimulationData,
          },
          expect.objectContaining({
            properties: expect.objectContaining({
              simulation_response: simulationResponse,
            }),
          }),
        );
      },
    );
  });

  it.each([
    ['receiving', false, 'simulation_receiving_assets_quantity'],
    ['sending', true, 'simulation_sending_assets_quantity'],
  ])('with asset quantity if %s', (_, isNegative, property) => {
    const balanceChange = {
      ...BALANCE_CHANGE_MOCK,
      amount: new BigNumber(isNegative ? -1 : 1),
    };

    expectUpdateTransactionMetricsCalled(
      {
        balanceChanges: [balanceChange, balanceChange, balanceChange],
      },
      expect.objectContaining({
        properties: expect.objectContaining({
          [property]: 3,
        }),
      }),
    );
  });

  it.each([
    [
      'receiving ERC-20',
      AssetType.ERC20,
      false,
      'simulation_receiving_assets_type',
      [AssetType.ERC20],
    ],
    [
      'sending ERC-20',
      AssetType.ERC20,
      true,
      'simulation_sending_assets_type',
      [AssetType.ERC20],
    ],
    [
      'receiving ERC-721',
      AssetType.ERC721,
      false,
      'simulation_receiving_assets_type',
      [AssetType.ERC721],
    ],
    [
      'sending ERC-721',
      AssetType.ERC721,
      true,
      'simulation_sending_assets_type',
      [AssetType.ERC721],
    ],
    [
      'receiving ERC-1155',
      AssetType.ERC1155,
      false,
      'simulation_receiving_assets_type',
      [AssetType.ERC1155],
    ],
    [
      'sending ERC-1155',
      AssetType.ERC1155,
      true,
      'simulation_sending_assets_type',
      [AssetType.ERC1155],
    ],
    [
      'receiving native',
      AssetType.Native,
      false,
      'simulation_receiving_assets_type',
      [AssetType.Native],
    ],
    [
      'sending native',
      AssetType.Native,
      true,
      'simulation_sending_assets_type',
      [AssetType.Native],
    ],
  ])('with asset type if %s', (_, type, isNegative, property, value) => {
    expectUpdateTransactionMetricsCalled(
      {
        balanceChanges: [
          {
            ...BALANCE_CHANGE_MOCK,
            asset: { ...BALANCE_CHANGE_MOCK.asset, type },
            amount: new BigNumber(isNegative ? -1 : 1),
          } as BalanceChange,
        ],
      },
      expect.objectContaining({
        properties: expect.objectContaining({
          [property]: value,
        }),
      }),
    );
  });

  it.each([
    [
      'receiving and available',
      1.23,
      false,
      'simulation_receiving_assets_value',
      FiatType.Available,
    ],
    [
      'receiving and not available',
      null,
      false,
      'simulation_receiving_assets_value',
      FiatType.NotAvailable,
    ],
    [
      'sending and available',
      1.23,
      true,
      'simulation_sending_assets_value',
      FiatType.Available,
    ],
    [
      'sending and not available',
      null,
      true,
      'simulation_sending_assets_value',
      FiatType.NotAvailable,
    ],
  ])(
    'with asset value if %s',
    (_, fiatAmount, isNegative, property, expected) => {
      const balanceChange = {
        ...BALANCE_CHANGE_MOCK,
        amount: new BigNumber(isNegative ? -1 : 1),
        fiatAmount,
      };

      expectUpdateTransactionMetricsCalled(
        {
          balanceChanges: [balanceChange],
        },
        expect.objectContaining({
          properties: expect.objectContaining({
            [property]: [expected],
          }),
        }),
      );
    },
  );

  it.each([
    ['receiving', false, 'simulation_receiving_assets_total_value'],
    ['sending', true, 'simulation_sending_assets_total_value'],
  ])('with asset total value if %s', (_, isNegative, property) => {
    const balanceChange1 = {
      ...BALANCE_CHANGE_MOCK,
      amount: new BigNumber(isNegative ? -1 : 1),
      fiatAmount: 1.23,
    };

    const balanceChange2 = {
      ...balanceChange1,
      fiatAmount: 1.23,
    };

    expectUpdateTransactionMetricsCalled(
      {
        balanceChanges: [balanceChange1, balanceChange2],
      },
      expect.objectContaining({
        sensitiveProperties: expect.objectContaining({
          [property]: 2.46,
        }),
      }),
    );
  });

  describe('creates incomplete asset event', () => {
    it('if fiat amount not available', () => {
      useDisplayNamesMock.mockReset();
      useDisplayNamesMock.mockReturnValue([DISPLAY_NAME_SAVED_MOCK]);

      useSimulationMetrics({
        enableMetrics: true,
        balanceChanges: [{ ...BALANCE_CHANGE_MOCK, fiatAmount: null }],
        simulationData: undefined,
        loading: false,
        transactionId: TRANSACTION_ID_MOCK,
      });

      expect(trackEventMock).toHaveBeenCalledTimes(1);
      expect(trackEventMock).toHaveBeenCalledWith(
        MetaMetricsEvents.INCOMPLETE_ASSET_DISPLAYED,
        {
          asset_address: ADDRESS_MOCK,
          asset_symbol: SYMBOL_MOCK,
          asset_petname: 'unknown',
          asset_type: AssetType.ERC20,
          fiat_conversion_available: FiatType.NotAvailable,
          location: 'confirmation',
        },
      );
    });
  });

  it.each([
    [
      'simulation disabled',
      true,
      { error: { code: SimulationErrorCode.Disabled } },
    ],
    [
      'chain not supported',
      true,
      { error: { code: SimulationErrorCode.ChainNotSupported } },
    ],
    ['metrics not enabled', false, undefined],
  ])('does not update fragment if %s', (_, enableMetrics, simulationData) => {
    useSimulationMetrics({
      enableMetrics,
      balanceChanges: [BALANCE_CHANGE_MOCK],
      simulationData: simulationData as SimulationData,
      loading: false,
      transactionId: TRANSACTION_ID_MOCK,
    });

    expect(updateTransactionMetricsMock).not.toHaveBeenCalled();
  });
});
