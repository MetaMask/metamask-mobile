import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import LiveStatus from './LiveStatus';
import { __resetCardClockForTest } from './sharedClock';

const NOW = new Date('2026-11-26T23:00:00.000Z');
const ENDS_AT = '2026-11-26T23:15:00.000Z';
const BADGE_TEST_ID = 'live-badge';

const renderLiveStatus = (
  props: Partial<React.ComponentProps<typeof LiveStatus>> = {},
) =>
  render(
    <LiveStatus
      endsAt={ENDS_AT}
      durationMs={15 * 60 * 1000}
      accentColor="rgb(247, 147, 26)"
      trackColor="rgb(200, 200, 200)"
      badgeTestID={BADGE_TEST_ID}
      {...props}
    />,
  );

describe('LiveStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    __resetCardClockForTest();
  });

  afterEach(() => {
    __resetCardClockForTest();
    jest.useRealTimers();
  });

  it('shows the live badge with the time left', () => {
    renderLiveStatus();

    expect(screen.getByTestId(BADGE_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByText('LIVE · 15:00')).toBeOnTheScreen();
  });

  it('renders the compact layout with the same badge', () => {
    renderLiveStatus({ compact: true });

    expect(screen.getByText('LIVE · 15:00')).toBeOnTheScreen();
  });

  it('shows a placeholder when endsAt is missing', () => {
    renderLiveStatus({ endsAt: undefined });

    expect(screen.getByText('LIVE · --:--')).toBeOnTheScreen();
  });

  it('counts down on the shared one-second clock', () => {
    renderLiveStatus();

    act(() => {
      jest.advanceTimersByTime(3_100);
    });

    expect(screen.getByText('LIVE · 14:57')).toBeOnTheScreen();
  });
});
