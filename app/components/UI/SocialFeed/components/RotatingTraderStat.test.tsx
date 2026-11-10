import { act, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import RotatingTraderStat from './RotatingTraderStat';
import { TraderStatRotationContext } from './TraderStatRotationContext';

const TEST_ID = 'trader-stat';
const INTERVAL_MS = 5000;

const LABELS = ['$50K P&L (30d)', '17.2K followers', '92% win rate'];

const advance = (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms);
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

    advance(INTERVAL_MS);
    const showedSecond = screen.queryByText('17.2K followers') !== null;
    advance(INTERVAL_MS);

    expect(showedSecond).toBe(true);
    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('92% win rate');
  });

  it('wraps back to the first stat', () => {
    renderWithProvider(<RotatingTraderStat labels={LABELS} testID={TEST_ID} />);

    advance(INTERVAL_MS * 3);

    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('$50K P&L (30d)');
  });

  it('holds the current stat until the rotation tick', () => {
    renderWithProvider(<RotatingTraderStat labels={LABELS} testID={TEST_ID} />);

    advance(INTERVAL_MS - 1);

    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('$50K P&L (30d)');
  });

  it('rotates stats mounted at different times together', () => {
    const first = renderWithProvider(
      <RotatingTraderStat labels={LABELS} testID="first-stat" />,
    );
    advance(1000);
    const second = renderWithProvider(
      <RotatingTraderStat labels={LABELS} testID="second-stat" />,
    );

    advance(INTERVAL_MS - 1000);

    expect(first.getByTestId('first-stat')).toHaveTextContent(
      '17.2K followers',
    );
    expect(second.getByTestId('second-stat')).toHaveTextContent(
      '17.2K followers',
    );
  });

  it('rotates only while its page is on screen', () => {
    const renderOnPage = (onScreen: boolean) => (
      <TraderStatRotationContext.Provider value={onScreen}>
        <RotatingTraderStat labels={LABELS} testID={TEST_ID} />
      </TraderStatRotationContext.Provider>
    );
    const { rerender } = renderWithProvider(renderOnPage(false));

    advance(INTERVAL_MS);
    const labelWhileOffScreen = screen.queryByText('$50K P&L (30d)') !== null;
    rerender(renderOnPage(true));
    advance(INTERVAL_MS);

    expect(labelWhileOffScreen).toBe(true);
    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('17.2K followers');
  });

  it('never rotates a lone stat', () => {
    renderWithProvider(
      <RotatingTraderStat labels={['92% win rate']} testID={TEST_ID} />,
    );

    advance(INTERVAL_MS);

    expect(screen.getByTestId(TEST_ID)).toHaveTextContent('92% win rate');
  });

  it('renders nothing without stats', () => {
    renderWithProvider(<RotatingTraderStat labels={[]} testID={TEST_ID} />);

    expect(screen.queryByTestId(TEST_ID)).toBeNull();
  });
});
