import React, { useState } from 'react';
import { fireEvent, type RenderResult } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type {
  InterestHistoryAvailability,
  InterestHistoryBucket,
  InterestHistoryRange,
  InterestHistoryResponse,
} from '../../hooks/useMoneyHistoricalEarnings';
import EarningsChart from './EarningsChart';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import type { EarningsRange } from './earningsHistory';

const mockOnRangeChange = jest.fn();
const mockOnRetry = jest.fn();

const available = {
  earnings: 'available',
  usd_pricing: 'available',
} as const;

const createBucket = (
  start: string,
  interestEarnedUsd: string | null,
  bucketAvailability: InterestHistoryAvailability = available,
): InterestHistoryBucket => ({
  start,
  end: new Date(Date.parse(start) + 24 * 60 * 60 * 1000).toISOString(),
  period_status: 'complete',
  availability: bucketAvailability,
  unavailable_reasons:
    bucketAvailability.earnings === 'available'
      ? []
      : ['before_user_earnings_inception'],
  interest_earned_musd_assets: interestEarnedUsd,
  interest_earned_usd: interestEarnedUsd,
  musd_price_usd: bucketAvailability.usd_pricing === 'available' ? '1' : null,
  price_as_of: bucketAvailability.usd_pricing === 'available' ? start : null,
  price_source:
    bucketAvailability.usd_pricing === 'available'
      ? 'metamask_price_api'
      : null,
  by_vault: [],
});

const createRange = (
  range: InterestHistoryRange['range'],
  buckets: InterestHistoryBucket[],
): InterestHistoryRange => ({
  range,
  granularity: 'day',
  range_start: buckets[0]?.start ?? '2026-11-09T00:00:00.000Z',
  range_end: buckets.at(-1)?.end ?? '2026-11-16T00:00:00.000Z',
  period_status: 'complete',
  availability: available,
  unavailable_reasons: [],
  totals: {
    interest_earned_musd_assets: '99',
    interest_earned_usd: '99',
  },
  buckets,
});

const createResponse = (
  ranges: InterestHistoryRange[] = [
    createRange('7d', [createBucket('2026-11-09T00:00:00.000Z', '1')]),
    createRange('30d', [
      createBucket('2026-11-09T00:00:00.000Z', '1'),
      createBucket('2026-11-10T00:00:00.000Z', '2'),
      createBucket('2026-11-11T00:00:00.000Z', null, {
        earnings: 'not_applicable',
        usd_pricing: 'not_applicable',
      }),
    ]),
  ],
): InterestHistoryResponse => ({
  address: '0x1234',
  chain_id: 143,
  bucket_timezone: 'UTC',
  updated_through: '2026-11-16T16:02:44.000Z',
  source_watermark: {
    vault_accounting: {
      block_number: '122782198',
      block_timestamp: '2026-11-16T16:02:44.000Z',
    },
  },
  method: 'nav_difference',
  denomination: {
    asset: 'mUSD',
    decimals: 6,
  },
  ranges,
});

const renderChart = ({
  entries = createResponse(),
  selectedRange = '30D',
  isLoading = false,
  isError = false,
  onRangeChange = mockOnRangeChange,
  onRetry = mockOnRetry,
}: {
  entries?: InterestHistoryResponse;
  selectedRange?: EarningsRange;
  isLoading?: boolean;
  isError?: boolean;
  onRangeChange?: (range: EarningsRange) => void;
  onRetry?: () => void;
} = {}): RenderResult =>
  renderWithProvider(
    <EarningsChart
      entries={entries}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      selectedRange={selectedRange}
      onRangeChange={onRangeChange}
    />,
    { state: { engine: { backgroundState: {} } } },
  );

const EarningsChartHarness = (): React.ReactElement => {
  const [selectedRange, setSelectedRange] = useState<EarningsRange>('30D');

  return (
    <EarningsChart
      entries={createResponse()}
      isLoading={false}
      isError={false}
      onRetry={mockOnRetry}
      selectedRange={selectedRange}
      onRangeChange={setSelectedRange}
    />
  );
};

const getBackgroundColor = (style: unknown): unknown => {
  if (
    !Array.isArray(style) ||
    typeof style[0] !== 'object' ||
    style[0] === null
  ) {
    return undefined;
  }

  return (style[0] as { backgroundColor?: unknown }).backgroundColor;
};

describe('EarningsChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one equal-width slot for each API bucket', () => {
    const { getByTestId } = renderChart();

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(2)),
    ).toBeOnTheScreen();
  });

  it('renders an available zero bucket with minimum height', () => {
    const entries = createResponse([
      createRange('30d', [createBucket('2026-11-09T00:00:00.000Z', '0')]),
    ]);

    const { getByTestId } = renderChart({ entries });

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_FILL(0)).props.style,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ height: 2 })]));
  });

  it('renders an unavailable bucket as a disabled empty slot', () => {
    const { getByTestId, queryByTestId } = renderChart();
    const slot = getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(2));

    expect(slot.props.accessibilityState).toEqual({
      selected: false,
      disabled: true,
    });
    expect(queryByTestId(MoneyEarningsViewTestIds.CHART_FILL(2))).toBeNull();
  });

  it('selects the latest available bucket by default', () => {
    const { getByTestId } = renderChart();

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)).props
        .accessibilityState,
    ).toEqual({
      selected: true,
      disabled: false,
    });
  });

  it('updates the active fill when a bucket is pressed', () => {
    const { getByTestId } = renderChart();

    fireEvent.press(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)));

    const activeColor = getBackgroundColor(
      getByTestId(MoneyEarningsViewTestIds.CHART_FILL(0)).props.style,
    );
    const mutedColor = getBackgroundColor(
      getByTestId(MoneyEarningsViewTestIds.CHART_FILL(1)).props.style,
    );

    expect(activeColor).toBeDefined();
    expect(activeColor).not.toBe(mutedColor);
  });

  it('exposes bucket date, amount, selected, and disabled accessibility state', () => {
    const { getByTestId } = renderChart();
    const slot = getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1));

    expect(slot.props.accessibilityRole).toBe('button');
    expect(slot.props.accessibilityLabel).toBe('Nov 10, +$2.00');
    expect(slot.props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });
  });

  it('keeps compact range selectors and changes the selected range', () => {
    const { getByLabelText, getByTestId } = renderWithProvider(
      <EarningsChartHarness />,
      { state: { engine: { backgroundState: {} } } },
    );

    expect(
      getByLabelText(strings('money.earnings.range_1w')),
    ).toBeOnTheScreen();
    expect(
      getByLabelText(strings('money.earnings.range_1m')),
    ).toBeOnTheScreen();

    fireEvent.press(getByLabelText(strings('money.earnings.range_1w')));

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)).props
        .accessibilityState,
    ).toEqual({
      selected: true,
      disabled: false,
    });
  });

  it('calls retry from the error state', () => {
    const { getByText } = renderChart({ isError: true });

    fireEvent.press(getByText(strings('money.earnings.retry')));

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when the selected range has no buckets', () => {
    const entries = createResponse([createRange('30d', [])]);
    const { getByTestId } = renderChart({ entries });

    expect(getByTestId(MoneyEarningsViewTestIds.EMPTY)).toBeOnTheScreen();
  });
});
