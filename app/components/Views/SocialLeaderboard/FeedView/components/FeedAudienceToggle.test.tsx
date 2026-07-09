import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import FeedAudienceToggle from './FeedAudienceToggle';
import { getFeedAudienceOptionTestId } from '../FeedView.testIds';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    withSpring: jest.fn((value: number) => value),
  };
});

jest.mock('../../../../../util/haptics', () => ({
  playSelection: () => mockPlaySelection(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('FeedAudienceToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both Following and All options', () => {
    renderWithProvider(<FeedAudienceToggle value="all" onChange={jest.fn()} />);

    expect(
      screen.getByTestId(getFeedAudienceOptionTestId('following')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getFeedAudienceOptionTestId('all')),
    ).toBeOnTheScreen();
  });

  it('calls onChange and plays a selection haptic when a different option is pressed', () => {
    const onChange = jest.fn();
    renderWithProvider(<FeedAudienceToggle value="all" onChange={onChange} />);

    fireEvent.press(
      screen.getByTestId(getFeedAudienceOptionTestId('following')),
    );

    expect(onChange).toHaveBeenCalledWith('following');
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('does not call onChange or play a haptic when the active option is pressed', () => {
    const onChange = jest.fn();
    renderWithProvider(<FeedAudienceToggle value="all" onChange={onChange} />);

    fireEvent.press(screen.getByTestId(getFeedAudienceOptionTestId('all')));

    expect(onChange).not.toHaveBeenCalled();
    expect(mockPlaySelection).not.toHaveBeenCalled();
  });
});
