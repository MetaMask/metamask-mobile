import { render, screen } from '@testing-library/react-native';
import React from 'react';

import ResearchChart, { RESEARCH_CHART_TEST_IDS } from './ResearchChart';
import {
  buildResearchChartSummary,
  formatResearchChartValue,
  getResearchChartDomain,
  getValidResearchChartPoints,
  ResearchChartPoint,
} from './ResearchChart.utils';

let mockBarChartProps: Record<string, unknown> = {};

jest.mock('react-native-svg-charts', () => {
  const { View: MockView } = jest.requireActual('react-native');

  return {
    BarChart: (props: Record<string, unknown>) => {
      mockBarChartProps = props;
      return <MockView />;
    },
  };
});

const POINTS: ResearchChartPoint[] = [
  {
    label: 'ETH',
    value: 3.25,
    sourceUrl: 'https://example.com/eth',
  },
  {
    label: 'BTC',
    value: -1.5,
    sourceUrl: 'https://example.com/btc',
  },
];

describe('ResearchChart', () => {
  it('renders a compact, accessible comparison with exact values', () => {
    render(
      <ResearchChart title="24-hour performance" unit="%" points={POINTS} />,
    );

    expect(
      screen.getByTestId(RESEARCH_CHART_TEST_IDS.CHART, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText('3.25%')).toBeOnTheScreen();
    expect(screen.getByText('-1.5%')).toBeOnTheScreen();
    expect(
      screen.getByTestId(RESEARCH_CHART_TEST_IDS.CONTAINER).props
        .accessibilityLabel,
    ).toBe(
      '24-hour performance. 2 source-backed points. Highest: ETH, 3.25%. Lowest: BTC, -1.5%.',
    );
    expect(
      screen.getByTestId(RESEARCH_CHART_TEST_IDS.SUMMARY),
    ).toHaveTextContent(
      '24-hour performance. 2 source-backed points. Highest: ETH, 3.25%. Lowest: BTC, -1.5%.',
    );
  });

  it('uses a zero-inclusive domain for mixed values', () => {
    render(
      <ResearchChart title="24-hour performance" unit="%" points={POINTS} />,
    );

    expect(mockBarChartProps.gridMin).toBeLessThan(-1.5);
    expect(mockBarChartProps.gridMax).toBeGreaterThan(3.25);
    const data = mockBarChartProps.data as { svg: { fill: string } }[];
    expect(data[0].svg.fill).not.toBe(data[1].svg.fill);
  });

  it.each([
    {
      name: 'too few points',
      points: POINTS.slice(0, 1),
    },
    {
      name: 'too many points',
      points: Array.from({ length: 9 }, (_, index) => ({
        ...POINTS[0],
        label: `Asset ${index}`,
      })),
    },
    {
      name: 'non-finite values',
      points: [{ ...POINTS[0], value: Number.NaN }, POINTS[1]],
    },
    {
      name: 'unsafe sources',
      points: [
        { ...POINTS[0], sourceUrl: ['java', 'script:alert(1)'].join('') },
        POINTS[1],
      ],
    },
  ])('renders nothing for $name', ({ points }) => {
    const { toJSON } = render(
      <ResearchChart title="Research" points={points} />,
    );

    expect(toJSON()).toBeNull();
  });
});

describe('ResearchChart utilities', () => {
  it.each([
    [1_250_000_000, 'USD', '$1.25B'],
    [-12_500, '$', '-$12.5K'],
    [0.004321, '%', '0.004321%'],
    [-0.00000012, '', '-1.20e-7'],
    [42, 'tokens', '42 tokens'],
  ])('formats %s %s as %s', (value, unit, expected) => {
    expect(formatResearchChartValue(value, unit)).toBe(expected);
  });

  it('rejects the full series when any point is not source-backed', () => {
    expect(
      getValidResearchChartPoints([POINTS[0], { ...POINTS[1], sourceUrl: '' }]),
    ).toEqual([]);
  });

  it('builds stable positive-only and negative-only domains', () => {
    expect(
      getResearchChartDomain(POINTS.map((point) => ({ ...point, value: 0 }))),
    ).toEqual({ minimum: -1, maximum: 1 });
    expect(
      getResearchChartDomain(
        POINTS.map((point, index) => ({ ...point, value: -index - 1 })),
      ).maximum,
    ).toBe(0);
  });

  it('summarizes equal values without implying a false range', () => {
    expect(
      buildResearchChartSummary(
        'Market caps',
        POINTS.map((point) => ({ ...point, value: 10 })),
        'USD',
      ),
    ).toBe('Market caps. 2 source-backed points. ETH is $10.');
  });
});
