import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import FeedTypeSheet from './FeedTypeSheet';
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

describe('FeedTypeSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    renderWithProvider(
      <FeedTypeSheet
        isOpen={false}
        value="all"
        onChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.queryByTestId(FeedViewSelectorsIDs.TYPE_SELECTOR_SHEET),
    ).not.toBeOnTheScreen();
  });

  it('selects a new option with a haptic and closes', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    renderWithProvider(
      <FeedTypeSheet
        isOpen
        value="all"
        onChange={onChange}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId(getFeedTypeOptionTestId('perps')));

    expect(onChange).toHaveBeenCalledWith('perps');
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onChange or play a haptic when the active option is selected', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    renderWithProvider(
      <FeedTypeSheet
        isOpen
        value="all"
        onChange={onChange}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId(getFeedTypeOptionTestId('all')));

    expect(onChange).not.toHaveBeenCalled();
    expect(mockPlaySelection).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
