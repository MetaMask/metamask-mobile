import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import OndoWinnerBanner from './OndoWinnerBanner';

jest.mock(
  '../../../../UI/MarketInsights/components/MarketInsightsEntryCard/AnimatedGradientBorder',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      AnimatedGradientBorder: () =>
        ReactActual.createElement(View, { testID: 'animated-border' }),
    };
  },
);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { campaignName?: string }) => {
    if (key === 'rewards.ondo_winning_banner.title') {
      return `Won:${params?.campaignName ?? ''}`;
    }
    if (key === 'rewards.ondo_winning_banner.description') {
      return 'Desc';
    }
    return key;
  },
}));

describe('OndoWinnerBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders title and description from i18n', () => {
    const { getByText, getByTestId } = render(
      <OndoWinnerBanner campaignName="Spring" testID="winner-banner" />,
    );
    expect(getByText('Won:Spring')).toBeOnTheScreen();
    expect(getByText('Desc')).toBeOnTheScreen();
    expect(getByTestId('winner-banner')).toBeOnTheScreen();
  });

  it('invokes onPress when provided', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <OndoWinnerBanner
        campaignName="C"
        onPress={onPress}
        testID="winner-banner"
      />,
    );
    fireEvent.press(getByTestId('winner-banner'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('bumps border animation key on interval after layout', () => {
    const { getByTestId, rerender } = render(
      <OndoWinnerBanner campaignName="C" testID="winner-banner" />,
    );
    fireEvent(getByTestId('winner-banner'), 'layout', {
      nativeEvent: { layout: { width: 200, height: 80 } },
    });
    rerender(<OndoWinnerBanner campaignName="C" testID="winner-banner" />);
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(getByTestId('animated-border')).toBeOnTheScreen();
  });
});
