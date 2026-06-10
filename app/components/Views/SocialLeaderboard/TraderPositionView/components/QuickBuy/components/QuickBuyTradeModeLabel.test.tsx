import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { AnimationDuration } from '@metamask/design-tokens';
import QuickBuyTradeModeLabel from './QuickBuyTradeModeLabel';

describe('QuickBuyTradeModeLabel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders the initial label', () => {
    render(<QuickBuyTradeModeLabel label="Pay with" />);
    expect(screen.getByText('Pay with')).toBeOnTheScreen();
  });

  it('shows both words simultaneously while cross-fading', () => {
    const { rerender } = render(<QuickBuyTradeModeLabel label="Pay with" />);

    rerender(<QuickBuyTradeModeLabel label="Receive" />);

    // Mid-transition both the outgoing and incoming words are mounted.
    act(() => {
      jest.advanceTimersByTime(AnimationDuration.Quickly / 2);
    });
    expect(screen.getByText('Pay with')).toBeOnTheScreen();
    expect(screen.getByText('Receive')).toBeOnTheScreen();
  });

  it('drops the outgoing word once the fade completes', () => {
    const { rerender } = render(<QuickBuyTradeModeLabel label="Pay with" />);

    rerender(<QuickBuyTradeModeLabel label="Receive" />);
    act(() => {
      jest.advanceTimersByTime(AnimationDuration.Quickly);
    });

    expect(screen.getByText('Receive')).toBeOnTheScreen();
    expect(screen.queryByText('Pay with')).not.toBeOnTheScreen();
  });

  it('does not start a transition when the label is unchanged', () => {
    const { rerender } = render(<QuickBuyTradeModeLabel label="Pay with" />);

    rerender(<QuickBuyTradeModeLabel label="Pay with" />);

    // No outgoing layer is ever mounted (single occurrence of the word).
    expect(screen.getAllByText('Pay with')).toHaveLength(1);
  });

  it('clears the pending cleanup timer on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { rerender, unmount } = render(
      <QuickBuyTradeModeLabel label="Pay with" />,
    );

    rerender(<QuickBuyTradeModeLabel label="Receive" />);
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
