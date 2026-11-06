import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import OnboardingProgress, { PROGRESS_FILL_MS } from './OnboardingProgress';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

const fillTestId = (index: number) =>
  `${SocialProfileOnboardingSelectorsIDs.PROGRESS}-fill-${index}`;

const renderProgress = (
  step: 'username' | 'avatar' | 'account' = 'username',
) => {
  const view = render(
    <OnboardingProgress step={step} path="manual" topInset={0} />,
  );
  return {
    ...view,
    goTo: (next: 'username' | 'avatar' | 'account') =>
      view.rerender(
        <OnboardingProgress step={next} path="manual" topInset={0} />,
      ),
  };
};

describe('OnboardingProgress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const flush = (ms = PROGRESS_FILL_MS) =>
    act(() => jest.advanceTimersByTime(ms));

  it('grows the active segment from 0% to 100%', () => {
    renderProgress();
    const active = screen.getByTestId(fillTestId(0));

    expect(active).toHaveAnimatedStyle({ width: '0%' });

    flush();

    expect(active).toHaveAnimatedStyle({ width: '100%' });
    expect(screen.getByTestId(fillTestId(1))).toHaveAnimatedStyle({
      width: '0%',
    });
  });

  it('grows only the newly active segment when moving forward', () => {
    const { goTo } = renderProgress();
    flush();

    goTo('avatar');

    expect(screen.getByTestId(fillTestId(0))).toHaveAnimatedStyle({
      width: '100%',
    });
    expect(screen.getByTestId(fillTestId(1))).toHaveAnimatedStyle({
      width: '0%',
    });

    flush();

    expect(screen.getByTestId(fillTestId(1))).toHaveAnimatedStyle({
      width: '100%',
    });
  });

  it('shrinks a segment when the user leaves it', () => {
    const { goTo } = renderProgress('avatar');
    flush();
    goTo('username');

    expect(screen.getByTestId(fillTestId(1))).toHaveAnimatedStyle({
      width: '100%',
    });

    flush();

    expect(screen.getByTestId(fillTestId(1))).toHaveAnimatedStyle({
      width: '0%',
    });
    expect(screen.getByTestId(fillTestId(0))).toHaveAnimatedStyle({
      width: '100%',
    });
  });
});
