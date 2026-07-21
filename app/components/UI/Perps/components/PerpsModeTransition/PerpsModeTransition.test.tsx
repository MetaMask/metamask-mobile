import React from 'react';
import { render, act } from '@testing-library/react-native';
import PerpsModeTransition from './PerpsModeTransition';
import { PerpsMode } from '../PerpsModeToggle';
import { PerpsModeTransitionSelectorsIDs } from '../../Perps.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.mode.pro_transition_title': 'Pro Mode',
      'perps.mode.lite_transition_title': 'Lite Mode',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsModeTransition', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Pro Mode title when switching to Pro', () => {
    const { getByTestId } = render(
      <PerpsModeTransition mode={PerpsMode.Pro} />,
    );

    expect(
      getByTestId(PerpsModeTransitionSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsModeTransitionSelectorsIDs.TITLE),
    ).toHaveTextContent('Pro Mode');
  });

  it('renders the Lite Mode title when switching to Lite', () => {
    const { getByTestId } = render(
      <PerpsModeTransition mode={PerpsMode.Lite} />,
    );

    expect(
      getByTestId(PerpsModeTransitionSelectorsIDs.TITLE),
    ).toHaveTextContent('Lite Mode');
  });

  it('invokes onDone after the given duration', () => {
    const onDone = jest.fn();
    render(
      <PerpsModeTransition
        mode={PerpsMode.Pro}
        durationMs={1000}
        onDone={onDone}
      />,
    );

    expect(onDone).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onDone if unmounted before the duration elapses', () => {
    const onDone = jest.fn();
    const { unmount } = render(
      <PerpsModeTransition
        mode={PerpsMode.Pro}
        durationMs={1000}
        onDone={onDone}
      />,
    );

    unmount();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onDone).not.toHaveBeenCalled();
  });
});
