import { act, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import RotatingTraderStat, { TRADER_STAT_FADE_MS } from './RotatingTraderStat';

const TEST_ID = 'trader-stat';
const INTERVAL_MS = 5000;

const LABELS = ['$50K P&L (30d)', '17.2K followers', '92% win rate'];

/** Advance past one hold plus the fade-out that swaps the text. */
const advanceOneRotation = () => {
  act(() => {
    jest.advanceTimersByTime(INTERVAL_MS);
  });
  act(() => {
    jest.advanceTimersByTime(TRADER_STAT_FADE_MS);
  });
};

describe('RotatingTraderStat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts on the first stat', () => {
    renderWithProvider(<RotatingTraderStat labels={LABELS} testID={TEST_ID} />);

    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('$50K P&L (30d)');
  });

  it('advances through the stats in order', () => {
    renderWithProvider(<RotatingTraderStat labels={LABELS} testID={TEST_ID} />);

    advanceOneRotation();
    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('17.2K followers');

    advanceOneRotation();
    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('92% win rate');
  });

  it('wraps back to the first stat', () => {
    renderWithProvider(<RotatingTraderStat labels={LABELS} testID={TEST_ID} />);

    advanceOneRotation();
    advanceOneRotation();
    advanceOneRotation();

    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('$50K P&L (30d)');
  });

  // The swap happens at the midpoint of the fade, so the old text must still
  // be there while the label is fading out.
  it('keeps the current stat until the fade-out completes', () => {
    renderWithProvider(<RotatingTraderStat labels={LABELS} testID={TEST_ID} />);

    act(() => {
      jest.advanceTimersByTime(INTERVAL_MS);
    });

    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('$50K P&L (30d)');
  });

  it('never rotates a lone stat', () => {
    renderWithProvider(
      <RotatingTraderStat labels={['92% win rate']} testID={TEST_ID} />,
    );

    advanceOneRotation();

    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('92% win rate');
  });

  it('renders nothing without stats', () => {
    renderWithProvider(<RotatingTraderStat labels={[]} testID={TEST_ID} />);

    expect(screen.queryByTestId(TEST_ID)).toBeNull();
  });
});
