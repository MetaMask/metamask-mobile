import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import FeedTypeSelector from './FeedTypeSelector';
import { FeedViewSelectorsIDs } from '../FeedView.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('FeedTypeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the selector pill with the current value label', () => {
    renderWithProvider(<FeedTypeSelector value="all" onPress={jest.fn()} />);

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.TYPE_SELECTOR),
    ).toBeOnTheScreen();
  });

  it('calls onPress when the pill is pressed', () => {
    const onPress = jest.fn();
    renderWithProvider(<FeedTypeSelector value="all" onPress={onPress} />);

    fireEvent.press(screen.getByTestId(FeedViewSelectorsIDs.TYPE_SELECTOR));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
