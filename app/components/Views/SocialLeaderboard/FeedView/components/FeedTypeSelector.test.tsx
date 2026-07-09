import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import FeedTypeSelector from './FeedTypeSelector';
import {
  FeedViewSelectorsIDs,
  getFeedTypeOptionTestId,
} from '../FeedView.testIds';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../../util/haptics', () => ({
  playSelection: () => mockPlaySelection(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('FeedTypeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the selector pill with the current value label', () => {
    renderWithProvider(<FeedTypeSelector value="all" onChange={jest.fn()} />);

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.TYPE_SELECTOR),
    ).toBeOnTheScreen();
  });

  it('opens the sheet and selects a new option with a haptic', () => {
    const onChange = jest.fn();
    renderWithProvider(<FeedTypeSelector value="all" onChange={onChange} />);

    fireEvent.press(screen.getByTestId(FeedViewSelectorsIDs.TYPE_SELECTOR));
    fireEvent.press(screen.getByTestId(getFeedTypeOptionTestId('perps')));

    expect(onChange).toHaveBeenCalledWith('perps');
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('does not call onChange or play a haptic when the active option is selected', () => {
    const onChange = jest.fn();
    renderWithProvider(<FeedTypeSelector value="all" onChange={onChange} />);

    fireEvent.press(screen.getByTestId(FeedViewSelectorsIDs.TYPE_SELECTOR));
    fireEvent.press(screen.getByTestId(getFeedTypeOptionTestId('all')));

    expect(onChange).not.toHaveBeenCalled();
    expect(mockPlaySelection).not.toHaveBeenCalled();
  });
});
