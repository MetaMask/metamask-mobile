import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import QuickBuyQuoteCountdown from './QuickBuyQuoteCountdown';

describe('QuickBuyQuoteCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when quotesLastFetchedAt is null', () => {
    render(
      <QuickBuyQuoteCountdown
        quotesLastFetchedAt={null}
        quoteRefreshRateMs={30000}
      />,
    );
    expect(screen.queryByText(/0:/)).not.toBeOnTheScreen();
  });

  it('renders a countdown when quotesLastFetchedAt is set', () => {
    const now = Date.now();
    render(
      <QuickBuyQuoteCountdown
        quotesLastFetchedAt={now}
        quoteRefreshRateMs={30000}
      />,
    );
    expect(screen.getByText('0:30')).toBeOnTheScreen();
  });

  it('zero-pads single-digit seconds', () => {
    const now = Date.now();
    render(
      <QuickBuyQuoteCountdown
        quotesLastFetchedAt={now - 21000}
        quoteRefreshRateMs={30000}
      />,
    );
    expect(screen.getByText('0:09')).toBeOnTheScreen();
  });

  it('ticks down every second', () => {
    const now = Date.now();
    render(
      <QuickBuyQuoteCountdown
        quotesLastFetchedAt={now}
        quoteRefreshRateMs={30000}
      />,
    );

    expect(screen.getByText('0:30')).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('0:29')).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.getByText('0:25')).toBeOnTheScreen();
  });

  it('shows 0:00 when the refresh window has elapsed', () => {
    const now = Date.now();
    render(
      <QuickBuyQuoteCountdown
        quotesLastFetchedAt={now}
        quoteRefreshRateMs={5000}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(screen.getByText('0:00')).toBeOnTheScreen();
  });

  it('resets to null state when quotesLastFetchedAt becomes null', () => {
    const now = Date.now();
    const { rerender } = render(
      <QuickBuyQuoteCountdown
        quotesLastFetchedAt={now}
        quoteRefreshRateMs={30000}
      />,
    );
    expect(screen.getByText('0:30')).toBeOnTheScreen();

    rerender(
      <QuickBuyQuoteCountdown
        quotesLastFetchedAt={null}
        quoteRefreshRateMs={30000}
      />,
    );
    expect(screen.queryByText(/0:/)).not.toBeOnTheScreen();
  });
});
