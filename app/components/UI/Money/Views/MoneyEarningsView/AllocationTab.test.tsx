import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useMoneyVaultComposition } from '../../hooks/useMoneyVaultComposition';
import type { VaultCompositionResponse } from '../../types/moneyVaultComposition';
import type { MoneyVaultCompositionChartProps } from './components/MoneyVaultCompositionChart';
import type { MoneyVaultCompositionMarketsTableProps } from './components/MoneyVaultCompositionMarketsTable';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import AllocationTab, { setAllocationScrollEnabled } from './AllocationTab';

const mockUseMoneyVaultComposition = jest.mocked(useMoneyVaultComposition);
const mockChart = jest.fn();
const mockMarketsTable = jest.fn();
const mockRefetch = jest.fn();
const mockSetNativeProps = jest.fn();

jest.mock('../../hooks/useMoneyVaultComposition', () => ({
  useMoneyVaultComposition: jest.fn(),
}));

jest.mock('./components/MoneyVaultCompositionChart', () => ({
  __esModule: true,
  default: (props: MoneyVaultCompositionChartProps) => {
    mockChart(props);
    return null;
  },
}));

jest.mock('./components/MoneyVaultCompositionMarketsTable', () => ({
  __esModule: true,
  default: (props: MoneyVaultCompositionMarketsTableProps) => {
    mockMarketsTable(props);
    return null;
  },
}));

const compositionData = {
  components: [
    {
      component_key: 'direct_idle_musd',
      label: 'Liquidity buffer',
      allocation_fraction: '0.6',
    },
  ],
  data_freshness: 'live',
  stale_reason: null,
} as unknown as VaultCompositionResponse;

const setCompositionResult = (
  overrides: Partial<ReturnType<typeof useMoneyVaultComposition>> = {},
): void => {
  mockUseMoneyVaultComposition.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
    ...overrides,
  } as ReturnType<typeof useMoneyVaultComposition>);
};

describe('AllocationTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCompositionResult();
  });

  it('requests composition with default hook options', () => {
    renderWithProvider(<AllocationTab />);

    expect(mockUseMoneyVaultComposition).toHaveBeenCalledWith();
  });

  it('renders a loading skeleton while composition data loads', () => {
    setCompositionResult({ isLoading: true });

    const { getByTestId } = renderWithProvider(<AllocationTab />);

    expect(
      getByTestId(MoneyEarningsViewTestIds.ALLOCATION_LOADING),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsViewTestIds.ALLOCATION_LOADING).props
        .accessibilityLabel,
    ).toBe(strings('money.earnings.allocation_loading'));
  });

  it('renders an error with a retry action', () => {
    setCompositionResult({ isError: true });

    const { getByTestId, getByText } = renderWithProvider(<AllocationTab />);

    expect(
      getByTestId(MoneyEarningsViewTestIds.ALLOCATION_ERROR),
    ).toBeOnTheScreen();

    fireEvent.press(getByText(strings('money.earnings.allocation_retry')));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders an error when the query returns no data', () => {
    const { getByTestId, getByText } = renderWithProvider(<AllocationTab />);

    expect(
      getByTestId(MoneyEarningsViewTestIds.ALLOCATION_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.earnings.allocation_retry')),
    ).toBeOnTheScreen();
  });

  it('renders an empty state when composition data is unavailable', () => {
    setCompositionResult({
      data: {
        ...compositionData,
        components: [],
      },
    });

    const { getByTestId, getByText } = renderWithProvider(<AllocationTab />);

    expect(
      getByTestId(MoneyEarningsViewTestIds.ALLOCATION_EMPTY),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.earnings.allocation_empty')),
    ).toBeOnTheScreen();
  });

  it('passes components unchanged and shows a degraded-data notice', () => {
    const degradedData = {
      ...compositionData,
      data_freshness: 'degraded',
      stale_reason: 'internal reason',
    } as VaultCompositionResponse;
    setCompositionResult({ data: degradedData });

    const { getByTestId, queryByText } = renderWithProvider(<AllocationTab />);

    expect(mockChart).toHaveBeenCalledWith(
      expect.objectContaining({
        setScrollEnabled: expect.any(Function),
      }),
    );
    const chartProps = mockChart.mock.calls.at(-1)?.[0] as
      | MoneyVaultCompositionChartProps
      | undefined;
    expect(chartProps?.components).toBe(degradedData.components);
    expect(mockMarketsTable).toHaveBeenCalledTimes(1);
    const marketsTableProps = mockMarketsTable.mock.calls.at(-1)?.[0] as
      | MoneyVaultCompositionMarketsTableProps
      | undefined;
    expect(marketsTableProps?.components).toBe(degradedData.components);
    expect(
      getByTestId(MoneyEarningsViewTestIds.ALLOCATION_DEGRADED),
    ).toBeOnTheScreen();
    expect(
      queryByText(strings('money.earnings.allocation_degraded')),
    ).toBeOnTheScreen();
    expect(queryByText('internal reason')).not.toBeOnTheScreen();
  });

  it('forwards the parent composition data to the markets table once', () => {
    setCompositionResult({ data: compositionData });

    renderWithProvider(<AllocationTab />);

    expect(mockMarketsTable).toHaveBeenCalledTimes(1);
    expect(mockMarketsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        components: compositionData.components,
      }),
    );
  });

  it('provides a scroll callback to the chart', () => {
    setCompositionResult({ data: compositionData });

    renderWithProvider(<AllocationTab />);

    const chartProps = mockChart.mock.calls.at(-1)?.[0] as
      | MoneyVaultCompositionChartProps
      | undefined;

    expect(chartProps?.setScrollEnabled).toEqual(expect.any(Function));
  });

  it('updates the parent ScrollView scroll state', () => {
    const scrollView = { setNativeProps: mockSetNativeProps };

    setAllocationScrollEnabled(scrollView, false);
    setAllocationScrollEnabled(scrollView, true);

    expect(mockSetNativeProps).toHaveBeenNthCalledWith(1, {
      scrollEnabled: false,
    });
    expect(mockSetNativeProps).toHaveBeenNthCalledWith(2, {
      scrollEnabled: true,
    });
  });
});
