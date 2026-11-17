import React, { useState } from 'react';
import {
  act,
  fireEvent,
  type RenderResult,
} from '@testing-library/react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
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
  end = new Date(Date.parse(start) + 24 * 60 * 60 * 1000).toISOString(),
): InterestHistoryBucket => ({
  start,
  end,
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
  granularity: InterestHistoryRange['granularity'] = 'day',
): InterestHistoryRange => ({
  range,
  granularity,
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

const flattenStyle = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (flattened, nestedStyle) => ({
        ...flattened,
        ...flattenStyle(nestedStyle),
      }),
      {},
    );
  }

  return typeof style === 'object' && style !== null
    ? (style as Record<string, unknown>)
    : {};
};

const createResponderEvent = (locationX: number, locationY: number) => {
  const timestamp = 1_763_400_000_000;

  return {
    nativeEvent: {
      locationX,
      locationY,
      pageX: locationX,
      pageY: locationY,
      identifier: 1,
      target: 0,
      timestamp,
    },
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      numberActiveTouches: 1,
      touchBank: [
        {
          touchActive: true,
          startPageX: locationX,
          startPageY: locationY,
          startTimeStamp: timestamp,
          currentPageX: locationX,
          currentPageY: locationY,
          currentTimeStamp: timestamp,
          previousPageX: locationX,
          previousPageY: locationY,
          previousTimeStamp: timestamp,
        },
      ],
    },
  };
};

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

const fireLayout = (
  node: { props: { onLayout?: (event: unknown) => void } },
  width: number,
): void => {
  act(() => {
    node.props.onLayout?.({ nativeEvent: { layout: { width } } });
  });
};

describe('EarningsChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one spaced slot and compact label for each API bucket', () => {
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
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(0)),
    ).toHaveTextContent('Nov 9');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(1)),
    ).toHaveTextContent('Nov 10');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(0)).props
        .numberOfLines,
    ).toBe(2);
    expect(
      flattenStyle(
        getByTestId(MoneyEarningsViewTestIds.CHART_FILL(0)).props.style,
      ),
    ).toEqual(expect.objectContaining({ width: '50%' }));
  });

  it('renders compact labels for weekly and monthly buckets', () => {
    const weeklyEntries = createResponse([
      createRange(
        '7d',
        [
          createBucket(
            '2026-11-09T00:00:00.000Z',
            '1',
            available,
            '2026-11-16T00:00:00.000Z',
          ),
        ],
        'week',
      ),
    ]);
    const weeklyChart = renderChart({
      entries: weeklyEntries,
      selectedRange: '1W',
    });

    expect(
      weeklyChart.getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(0)),
    ).toHaveTextContent('M');

    fireEvent(
      weeklyChart.getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)),
      'pressIn',
    );
    expect(
      weeklyChart.getByTestId(MoneyEarningsViewTestIds.CHART_PILL),
    ).toHaveTextContent('+$1.00 · Nov 9 – Nov 15');

    const monthlyEntries = createResponse([
      createRange(
        '90d',
        [createBucket('2026-11-09T00:00:00.000Z', '1')],
        'month',
      ),
    ]);
    const monthlyChart = renderChart({
      entries: monthlyEntries,
      selectedRange: '3M',
    });

    expect(
      monthlyChart.getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(0)),
    ).toHaveTextContent('N\nov');
  });

  it('formats labels for each earnings range', () => {
    const entries = createResponse([
      createRange('7d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-11-10T00:00:00.000Z', '1'),
      ]),
      createRange('30d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-12-01T00:00:00.000Z', '1'),
      ]),
      createRange('90d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-11-10T00:00:00.000Z', '1'),
        createBucket('2026-12-01T00:00:00.000Z', '1'),
      ]),
      createRange('180d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-12-01T00:00:00.000Z', '1'),
      ]),
      createRange('365d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-12-01T00:00:00.000Z', '1'),
      ]),
    ]);

    const weeklyChart = renderChart({ entries, selectedRange: '1W' });
    expect(
      weeklyChart.getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(0)),
    ).toHaveTextContent('M');

    const monthlyChart = renderChart({ entries, selectedRange: '30D' });
    expect(
      monthlyChart.getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(0)),
    ).toHaveTextContent('Nov 9');
    expect(
      monthlyChart.getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(1)),
    ).toHaveTextContent('Dec 1');

    const threeMonthChart = renderChart({ entries, selectedRange: '3M' });
    expect(
      threeMonthChart.getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(0)),
    ).toHaveTextContent('N\nov');
    expect(
      threeMonthChart.getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(1)),
    ).toHaveTextContent(/^$/);
    expect(
      threeMonthChart.getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(2)),
    ).toHaveTextContent('D\nec');

    const sixMonthChart = renderChart({ entries, selectedRange: '6M' });
    expect(
      sixMonthChart.getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(1)),
    ).toHaveTextContent('Dec');

    const oneYearChart = renderChart({ entries, selectedRange: '1Y' });
    expect(
      oneYearChart.getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(1)),
    ).toHaveTextContent('D');
  });

  it('uses localized narrow weekday labels without truncating short names', () => {
    const originalLocale = I18n.locale;
    I18n.locale = 'es';

    try {
      const entries = createResponse([
        createRange('7d', [
          createBucket('2026-11-11T00:00:00.000Z', '1'),
          createBucket('2026-11-12T00:00:00.000Z', '1'),
        ]),
      ]);
      const { getByTestId } = renderChart({
        entries,
        selectedRange: '1W',
      });

      expect(
        getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(0)),
      ).toHaveTextContent('X');
      expect(
        getByTestId(MoneyEarningsViewTestIds.CHART_X_LABEL(1)),
      ).toHaveTextContent('J');
    } finally {
      I18n.locale = originalLocale;
    }
  });

  it('renders USD scale labels and gridlines', () => {
    const { getByTestId } = renderChart();

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_Y_LABEL(0)),
    ).toHaveTextContent('$2');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_Y_LABEL(1)),
    ).toHaveTextContent('$1');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_GRIDLINE(0)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_GRIDLINE(1)),
    ).toBeOnTheScreen();
  });

  it('renders a cent-scaled axis for sub-cent earnings', () => {
    const entries = createResponse([
      createRange('30d', [createBucket('2026-11-09T00:00:00.000Z', '0.001')]),
    ]);
    const { getByTestId } = renderChart({ entries });

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_Y_LABEL(0)),
    ).toHaveTextContent('$0.01');
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_Y_LABEL(1)),
    ).toHaveTextContent('<$0.01');
    expect(
      flattenStyle(
        getByTestId(MoneyEarningsViewTestIds.CHART_FILL(0)).props.style,
      ),
    ).toEqual(expect.objectContaining({ height: 2 }));
  });

  it('renders an available zero bucket with minimum height', () => {
    const entries = createResponse([
      createRange('30d', [createBucket('2026-11-09T00:00:00.000Z', '0')]),
    ]);

    const { getByTestId } = renderChart({ entries });

    expect(
      flattenStyle(
        getByTestId(MoneyEarningsViewTestIds.CHART_FILL(0)).props.style,
      ),
    ).toEqual(expect.objectContaining({ height: 2 }));
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

  it('does not select a bucket before it is held', () => {
    const { getByTestId } = renderChart();

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)).props
        .accessibilityState,
    ).toEqual({
      selected: false,
      disabled: false,
    });
  });

  it('activates only the held bucket and renders its earnings pill', () => {
    const { getByTestId } = renderChart();

    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)), 'pressIn');

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)).props
        .accessibilityState,
    ).toEqual({
      selected: true,
      disabled: false,
    });
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)).props
        .accessibilityState,
    ).toEqual({
      selected: false,
      disabled: false,
    });
    expect(
      flattenStyle(
        getByTestId(MoneyEarningsViewTestIds.CHART_FILL(1)).props.style,
      ),
    ).toEqual(expect.objectContaining({ opacity: 0.35 }));
    expect(getByTestId(MoneyEarningsViewTestIds.CHART_PILL)).toHaveTextContent(
      '+$1.00 · Nov 9',
    );
  });

  it('clears the active bucket when the hold ends', () => {
    const { getByTestId, queryByTestId } = renderChart();

    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)), 'pressIn');
    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)), 'pressOut');

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)).props
        .accessibilityState,
    ).toEqual({
      selected: false,
      disabled: false,
    });
    expect(
      queryByTestId(MoneyEarningsViewTestIds.CHART_PILL),
    ).not.toBeOnTheScreen();
  });

  it('does not persist a bucket after a tap gesture', () => {
    const { getByTestId } = renderChart();
    const slot = getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0));

    fireEvent(slot, 'pressIn');
    expect(slot.props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });

    fireEvent(slot, 'pressOut');

    expect(slot.props.accessibilityState).toEqual({
      selected: false,
      disabled: false,
    });
  });

  it('renders the held pill as a single absolutely-positioned element so the label does not truncate', () => {
    const entries = createResponse([
      createRange('30d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-11-10T00:00:00.000Z', '2'),
        createBucket('2026-11-11T00:00:00.000Z', '3'),
      ]),
    ]);
    const { getByTestId } = renderChart({ entries });

    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(2)), 'pressIn');

    const pill = getByTestId(MoneyEarningsViewTestIds.CHART_PILL);
    expect(typeof pill.props.onLayout).toBe('function');
    expect(flattenStyle(pill.props.style)).toEqual(
      expect.objectContaining({
        position: 'absolute',
        top: -12,
      }),
    );
  });

  it('hides the pill until onLayout measures its width, then reveals it centered and clamped under the bar', () => {
    const entries = createResponse([
      createRange('30d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-11-10T00:00:00.000Z', '2'),
        createBucket('2026-11-11T00:00:00.000Z', '3'),
      ]),
    ]);
    const { getByTestId } = renderChart({ entries });

    fireLayout(getByTestId(MoneyEarningsViewTestIds.CHART_PLOT), 300);
    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)), 'pressIn');

    const pill = getByTestId(MoneyEarningsViewTestIds.CHART_PILL);

    // Pre-measurement: invisible to avoid a visible shift.
    expect(flattenStyle(pill.props.style)).toEqual(
      expect.objectContaining({ opacity: 0 }),
    );

    fireLayout(pill, 80);

    const measuredStyle = flattenStyle(
      getByTestId(MoneyEarningsViewTestIds.CHART_PILL).props.style,
    );
    // Bar 1 of 3 on a 300pt plot: center = (1 + 0.5) / 3 * 300 = 150.
    // Clamped left = 150 - 80 / 2 = 110.
    expect(measuredStyle).toEqual(
      expect.objectContaining({ left: 110, opacity: 1 }),
    );
  });

  it('clamps the pill to the left edge when the first bar is selected', () => {
    const entries = createResponse([
      createRange('30d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-11-10T00:00:00.000Z', '2'),
        createBucket('2026-11-11T00:00:00.000Z', '3'),
      ]),
    ]);
    const { getByTestId } = renderChart({ entries });

    fireLayout(getByTestId(MoneyEarningsViewTestIds.CHART_PLOT), 300);
    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)), 'pressIn');
    fireLayout(getByTestId(MoneyEarningsViewTestIds.CHART_PILL), 120);

    // Bar 0 center = 50; 50 - 60 = -10, clamped to 0.
    expect(
      flattenStyle(
        getByTestId(MoneyEarningsViewTestIds.CHART_PILL).props.style,
      ),
    ).toEqual(expect.objectContaining({ left: 0 }));
  });

  it('clamps the pill to the right edge when the last bar is selected', () => {
    const entries = createResponse([
      createRange('30d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-11-10T00:00:00.000Z', '2'),
        createBucket('2026-11-11T00:00:00.000Z', '3'),
      ]),
    ]);
    const { getByTestId } = renderChart({ entries });

    fireLayout(getByTestId(MoneyEarningsViewTestIds.CHART_PLOT), 300);
    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(2)), 'pressIn');
    fireLayout(getByTestId(MoneyEarningsViewTestIds.CHART_PILL), 120);

    // Bar 2 center = 250; 250 - 60 = 190; clamp to plotWidth - pillWidth = 180.
    expect(
      flattenStyle(
        getByTestId(MoneyEarningsViewTestIds.CHART_PILL).props.style,
      ),
    ).toEqual(expect.objectContaining({ left: 180 }));
  });

  it('keeps the pill visible when the selected bar changes', () => {
    const entries = createResponse([
      createRange('30d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-11-10T00:00:00.000Z', '2'),
        createBucket('2026-11-11T00:00:00.000Z', '3'),
      ]),
    ]);
    const { getByTestId } = renderChart({ entries });

    fireLayout(getByTestId(MoneyEarningsViewTestIds.CHART_PLOT), 300);

    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)), 'pressIn');
    fireLayout(getByTestId(MoneyEarningsViewTestIds.CHART_PILL), 80);
    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)), 'pressOut');

    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)), 'pressIn');

    expect(
      flattenStyle(
        getByTestId(MoneyEarningsViewTestIds.CHART_PILL).props.style,
      ),
    ).toEqual(expect.objectContaining({ opacity: 1 }));
  });

  it('scrubs from a non-first bucket without resetting to the first bucket', () => {
    const entries = createResponse([
      createRange('30d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-11-10T00:00:00.000Z', '2'),
        createBucket('2026-11-11T00:00:00.000Z', '3'),
      ]),
    ]);
    const { getByTestId } = renderChart({ entries });
    const plot = getByTestId(MoneyEarningsViewTestIds.CHART_PLOT);

    fireEvent(plot, 'layout', {
      nativeEvent: { layout: { width: 300 } },
    });
    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)), 'pressIn');
    fireEvent(plot, 'responderGrant', createResponderEvent(150, 80));

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)).props
        .accessibilityState,
    ).toEqual({
      selected: false,
      disabled: false,
    });
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)).props
        .accessibilityState,
    ).toEqual({
      selected: true,
      disabled: false,
    });
  });

  it('switches to a neighbour bar only after crossing the midpoint between bars in either direction', () => {
    // Build a responder event with a single-touch history at a given x and
    // a monotonically-increasing timestamp. PanResponder reads
    // `touchHistory.touchBank[indexOfSingleActiveTouch]` to update moveX
    // only when `currentTimeStamp > _accountsForMovesUpTo`, so each
    // successive event must bump the timestamp.
    let nextTimestamp = 1_000;
    const buildResponderEvent = (locationX: number) => {
      const timestamp = nextTimestamp;
      nextTimestamp += 10;
      return {
        nativeEvent: {
          locationX,
          locationY: 80,
          pageX: locationX,
          pageY: 80,
          identifier: 0,
          target: 0,
          timestamp,
          touches: [{ identifier: 0, pageX: locationX, pageY: 80 }],
        },
        touchHistory: {
          indexOfSingleActiveTouch: 0,
          mostRecentTimeStamp: timestamp,
          numberActiveTouches: 1,
          touchBank: [
            {
              touchActive: true,
              startPageX: locationX,
              startPageY: 80,
              startTimeStamp: timestamp,
              currentPageX: locationX,
              currentPageY: 80,
              currentTimeStamp: timestamp,
              previousPageX: locationX,
              previousPageY: 80,
              previousTimeStamp: timestamp,
            },
          ],
        },
      };
    };

    const entries = createResponse([
      createRange('30d', [
        createBucket('2026-11-09T00:00:00.000Z', '1'),
        createBucket('2026-11-10T00:00:00.000Z', '2'),
        createBucket('2026-11-11T00:00:00.000Z', '3'),
      ]),
    ]);
    const { getByTestId } = renderChart({ entries });
    const plot = getByTestId(MoneyEarningsViewTestIds.CHART_PLOT);

    // plotWidth 300 / 3 bars → 100-wide slots, centres at 50 / 150 / 250,
    // slot boundaries at 100 and 200.
    fireLayout(plot, 300);

    // Press bar 1 → anchors the scrub at its centre (x = 150).
    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)), 'pressIn');
    fireLayout(getByTestId(MoneyEarningsViewTestIds.CHART_PILL), 80);

    // Simulate the capture → grant handshake at the pressed bar's centre so
    // PanResponder's internal gestureState is realistic: x0 = 150, moveX = 150.
    act(() => {
      plot.props.onMoveShouldSetResponderCapture(buildResponderEvent(150));
      plot.props.onResponderGrant(buildResponderEvent(150));
    });

    const dragTo = (x: number): void => {
      act(() => {
        plot.props.onResponderMove(buildResponderEvent(x));
      });
    };

    // Drag 49px left of centre — still inside bar 1's slot, no switch.
    dragTo(101);
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)).props
        .accessibilityState.selected,
    ).toBe(true);

    // Drag past the left midpoint (x < 100) — previous bar selected.
    dragTo(99);
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)).props
        .accessibilityState.selected,
    ).toBe(true);
    expect(
      flattenStyle(
        getByTestId(MoneyEarningsViewTestIds.CHART_PILL).props.style,
      ),
    ).toEqual(expect.objectContaining({ opacity: 1 }));

    // Drag 49px right of centre — still inside bar 1's slot, no switch.
    dragTo(199);
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)).props
        .accessibilityState.selected,
    ).toBe(true);

    // Drag past the right midpoint (x > 200) — next bar selected.
    dragTo(201);
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(2)).props
        .accessibilityState.selected,
    ).toBe(true);
  });

  it('updates selection while dragging and clears on release', () => {
    const { getByTestId, queryByTestId } = renderChart();
    const plot = getByTestId(MoneyEarningsViewTestIds.CHART_PLOT);

    fireEvent(plot, 'layout', {
      nativeEvent: { layout: { width: 300 } },
    });
    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)), 'pressIn');
    fireEvent(plot, 'responderGrant', createResponderEvent(150, 80));
    fireEvent(plot, 'responderMove', createResponderEvent(250, 80));

    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1)).props
        .accessibilityState,
    ).toEqual({
      selected: false,
      disabled: false,
    });
    expect(
      getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(2)).props
        .accessibilityState,
    ).toEqual({
      selected: false,
      disabled: true,
    });
    expect(queryByTestId(MoneyEarningsViewTestIds.CHART_PILL)).toBeNull();

    fireEvent(plot, 'responderRelease', createResponderEvent(250, 80));
    expect(queryByTestId(MoneyEarningsViewTestIds.CHART_PILL)).toBeNull();
  });

  it('only claims predominantly horizontal movement', () => {
    const { getByTestId } = renderChart();
    const plot = getByTestId(MoneyEarningsViewTestIds.CHART_PLOT);

    expect(
      plot.props.onMoveShouldSetResponderCapture({}, { dx: 20, dy: 5 }),
    ).toBe(true);
    expect(
      plot.props.onMoveShouldSetResponderCapture({}, { dx: 5, dy: 20 }),
    ).toBe(false);
  });

  it('renders precise positive sub-cent earnings in the held pill', () => {
    const entries = createResponse([
      createRange('30d', [createBucket('2026-11-09T00:00:00.000Z', '0.001')]),
    ]);
    const { getByTestId } = renderChart({ entries });

    fireEvent(getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(0)), 'pressIn');

    expect(getByTestId(MoneyEarningsViewTestIds.CHART_PILL)).toHaveTextContent(
      '+$0.001 · Nov 9',
    );
  });

  it('exposes bucket date, amount, selected, and disabled accessibility state', () => {
    const { getByTestId } = renderChart();
    const slot = getByTestId(MoneyEarningsViewTestIds.CHART_SLOT(1));

    expect(slot.props.accessibilityRole).toBe('button');
    expect(slot.props.accessibilityLabel).toBe('Nov 10, +$2.00');
    expect(slot.props.accessibilityState).toEqual({
      selected: false,
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
      selected: false,
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
