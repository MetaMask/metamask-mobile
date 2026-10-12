import React from 'react';
import { render } from '@testing-library/react-native';
import type { TokenPerformance } from '../../hooks/useTokenPerformance';
import PerformanceSection from './PerformanceSection';

const performance = (values: {
  fiveMinute?: number | null;
  oneHour?: number | null;
  fourHour?: number | null;
  twentyFourHour?: number | null;
}): TokenPerformance => ({
  fiveMinute: null,
  oneHour: null,
  fourHour: null,
  twentyFourHour: null,
  ...values,
});

describe('PerformanceSection', () => {
  it('renders small percentages with two decimals and an explicit sign', () => {
    const { getByTestId } = render(
      <PerformanceSection
        performance={performance({
          fiveMinute: 3.09,
          oneHour: -0.52,
          fourHour: 0,
        })}
      />,
    );

    expect(
      getByTestId('token-details-overview-tab-performance-value-5m'),
    ).toHaveTextContent('+3.09%');
    expect(
      getByTestId('token-details-overview-tab-performance-value-1h'),
    ).toHaveTextContent('-0.52%');
    // Zero is a real value — only missing data renders the dash.
    expect(
      getByTestId('token-details-overview-tab-performance-value-4h'),
    ).toHaveTextContent('0.00%');
  });

  it('compacts large percentages into K / M / B units', () => {
    const { getByTestId } = render(
      <PerformanceSection
        performance={performance({
          fiveMinute: 1234,
          oneHour: 12345678.9,
          fourHour: -987654321,
          twentyFourHour: 999999,
        })}
      />,
    );

    expect(
      getByTestId('token-details-overview-tab-performance-value-5m'),
    ).toHaveTextContent('+1.2K%');
    expect(
      getByTestId('token-details-overview-tab-performance-value-1h'),
    ).toHaveTextContent('+12.3M%');
    expect(
      getByTestId('token-details-overview-tab-performance-value-4h'),
    ).toHaveTextContent('-987.7M%');
    expect(
      getByTestId('token-details-overview-tab-performance-value-24h'),
    ).toHaveTextContent('+1M%');
  });

  it('keeps values just below the compact threshold in decimal form', () => {
    const { getByTestId } = render(
      <PerformanceSection performance={performance({ fiveMinute: 999.99 })} />,
    );

    expect(
      getByTestId('token-details-overview-tab-performance-value-5m'),
    ).toHaveTextContent('+999.99%');
  });

  it('renders a dash for cells with no data', () => {
    const { getByTestId } = render(
      <PerformanceSection performance={performance({})} />,
    );

    expect(
      getByTestId('token-details-overview-tab-performance-value-1h'),
    ).toHaveTextContent('—');
  });
});
