import React from 'react';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ReplitAnimatedAmount from './ReplitAnimatedAmount';

// Select the native overload exercised by this component before spying on it.
const motionEvents: {
  addEventListener(
    event: 'reduceMotionChanged',
    listener: (enabled: boolean) => void,
  ): { remove(): void };
} = AccessibilityInfo;

describe('ReplitAnimatedAmount', () => {
  const initialState = AppState.currentState;
  let tick: FrameRequestCallback;
  let appChanged: (status: AppStateStatus) => void;
  let motionChanged: (reduced: boolean) => void;
  beforeEach(() => {
    AppState.currentState = 'active';
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    jest
      .spyOn(motionEvents, 'addEventListener')
      .mockImplementation((_, listener) => {
        motionChanged = listener;
        return { remove: jest.fn() };
      });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        appChanged = listener;
        return { remove: jest.fn() };
      });
    jest.spyOn(performance, 'now').mockReturnValue(0);
    jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        tick = callback;
        return 42;
      });
    jest
      .spyOn(global, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    AppState.currentState = initialState;
    jest.restoreAllMocks();
  });

  it('counts to the receipt value with the original cubic duration and exposes the final accessible amount', async () => {
    renderWithProvider(<ReplitAnimatedAmount value={100} testID="amount" />);
    await act(async () => undefined);
    expect(screen.getByTestId('amount')).toHaveTextContent('$0');
    expect(screen.getByTestId('amount')).toHaveProp(
      'accessibilityLabel',
      '$100',
    );

    act(() => tick(650));

    expect(screen.getByTestId('amount')).toHaveTextContent('$88');
    act(() => tick(1300));
    expect(screen.getByTestId('amount')).toHaveTextContent('$100');
  });

  it('immediately shows the confirmed value and cancels motion when the app backgrounds', async () => {
    renderWithProvider(<ReplitAnimatedAmount value={42} testID="amount" />);
    await act(async () => undefined);

    act(() => appChanged('background'));

    expect(screen.getByTestId('amount')).toHaveTextContent('$42');
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });

  it('reacts to a live reduce-motion preference without changing the receipt', async () => {
    renderWithProvider(<ReplitAnimatedAmount value={11.05} testID="amount" />);
    await act(async () => undefined);

    act(() => motionChanged(true));

    expect(screen.getByTestId('amount')).toHaveTextContent('$11.05');
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });

  it('cancels scheduled frames when the presentation leaves the tree', async () => {
    const { unmount } = renderWithProvider(
      <ReplitAnimatedAmount value={100} />,
    );
    await act(async () => undefined);

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
});
