import React from 'react';
import { render } from '@testing-library/react-native';
import BalanceHistoryChart from './BalanceHistoryChart';
import { BALANCE_HISTORY_CHART_TEST_IDS } from './BalanceHistoryChart.constants';

jest.mock('react-native-svg-charts', () => {
  const actual = jest.requireActual('react-native-svg-charts');
  return {
    ...actual,
  };
});

jest.mock('react-native-skeleton-placeholder', () => {
  const { View } = jest.requireActual('react-native');
  const MockPlaceholder = ({ children }: { children: React.ReactNode }) => (
    <View>{children}</View>
  );
  MockPlaceholder.Item = View;
  return { __esModule: true, default: MockPlaceholder };
});

jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

const MOCK_DATA = [
  { date: '2026-03-01', value: 0 },
  { date: '2026-03-05', value: 1200 },
  { date: '2026-03-10', value: 2500 },
  { date: '2026-03-15', value: 5000 },
  { date: '2026-03-20', value: 7500 },
  { date: '2026-03-25', value: 9500 },
  { date: '2026-03-31', value: 12000 },
];

const MOCK_THRESHOLDS = [
  { label: 'Bronze', value: 1000 },
  { label: 'Silver', value: 5000 },
  { label: 'Gold', value: 10000 },
];

describe('BalanceHistoryChart', () => {
  it('renders chart with valid data', () => {
    const { getByTestId } = render(<BalanceHistoryChart data={MOCK_DATA} />);
    expect(getByTestId(BALANCE_HISTORY_CHART_TEST_IDS.CONTAINER)).toBeTruthy();
    expect(getByTestId(BALANCE_HISTORY_CHART_TEST_IDS.CHART_AREA)).toBeTruthy();
  });

  it('renders with threshold lines', () => {
    const { getByTestId } = render(
      <BalanceHistoryChart data={MOCK_DATA} thresholdLines={MOCK_THRESHOLDS} />,
    );
    expect(getByTestId(BALANCE_HISTORY_CHART_TEST_IDS.CONTAINER)).toBeTruthy();
  });

  it('shows loading skeleton when isLoading is true', () => {
    const { getByTestId, queryByTestId } = render(
      <BalanceHistoryChart data={[]} isLoading />,
    );
    expect(getByTestId(BALANCE_HISTORY_CHART_TEST_IDS.LOADING)).toBeTruthy();
    expect(queryByTestId(BALANCE_HISTORY_CHART_TEST_IDS.CONTAINER)).toBeNull();
  });

  it('shows empty state when data is empty', () => {
    const { getByTestId } = render(<BalanceHistoryChart data={[]} />);
    expect(getByTestId(BALANCE_HISTORY_CHART_TEST_IDS.EMPTY)).toBeTruthy();
  });

  it('accepts a custom formatValue function', () => {
    const customFormat = jest.fn((v: number) => `€${v.toFixed(0)}`);
    const { getByTestId } = render(
      <BalanceHistoryChart data={MOCK_DATA} formatValue={customFormat} />,
    );
    expect(getByTestId(BALANCE_HISTORY_CHART_TEST_IDS.CONTAINER)).toBeTruthy();
  });

  it('renders with useLogScale when data has positive values', () => {
    const { getByTestId } = render(
      <BalanceHistoryChart data={MOCK_DATA} useLogScale />,
    );
    expect(getByTestId(BALANCE_HISTORY_CHART_TEST_IDS.CONTAINER)).toBeTruthy();
    expect(getByTestId(BALANCE_HISTORY_CHART_TEST_IDS.CHART_AREA)).toBeTruthy();
  });
});
