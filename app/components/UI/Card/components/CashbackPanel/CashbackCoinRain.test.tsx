import React from 'react';
import { render } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';
import CashbackCoinRain from './CashbackCoinRain';
import { CashbackPanelSelectors } from './CashbackPanel.testIds';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return { ...actual, useReducedMotion: jest.fn(() => false) };
});

describe('CashbackCoinRain', () => {
  beforeEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('renders a non-interactive full-screen overlay', () => {
    const { getByTestId } = render(<CashbackCoinRain onComplete={jest.fn()} />);

    expect(getByTestId(CashbackPanelSelectors.COIN_RAIN).props).toMatchObject({
      pointerEvents: 'none',
    });
  });

  it('skips the rain and completes straight away under Reduce Motion', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const onComplete = jest.fn();

    const { queryByTestId } = render(
      <CashbackCoinRain onComplete={onComplete} />,
    );

    expect(queryByTestId(CashbackPanelSelectors.COIN_RAIN)).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
