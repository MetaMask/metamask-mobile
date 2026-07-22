import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TypeFilterSheet from './TypeFilterSheet';
import {
  TypeFilterSelectorsIDs,
  getTypeFilterOptionTestId,
} from './TypeFilter.testIds';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../../util/haptics', () => ({
  playSelection: () => mockPlaySelection(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('TypeFilterSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    renderWithProvider(
      <TypeFilterSheet
        isOpen={false}
        value="all"
        onChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.queryByTestId(TypeFilterSelectorsIDs.SHEET),
    ).not.toBeOnTheScreen();
  });

  it('selects a new option with a haptic and closes', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    renderWithProvider(
      <TypeFilterSheet
        isOpen
        value="all"
        onChange={onChange}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId(getTypeFilterOptionTestId('perps')));

    expect(onChange).toHaveBeenCalledWith('perps');
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onChange or play a haptic when the active option is selected', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    renderWithProvider(
      <TypeFilterSheet
        isOpen
        value="all"
        onChange={onChange}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByTestId(getTypeFilterOptionTestId('all')));

    expect(onChange).not.toHaveBeenCalled();
    expect(mockPlaySelection).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('uses custom testIDs when provided', () => {
    renderWithProvider(
      <TypeFilterSheet
        isOpen
        value="all"
        onChange={jest.fn()}
        onClose={jest.fn()}
        sheetTestID="custom-sheet"
        getOptionTestID={(v) => `custom-option-${v}`}
      />,
    );

    expect(screen.getByTestId('custom-sheet')).toBeOnTheScreen();
    expect(screen.getByTestId('custom-option-perps')).toBeOnTheScreen();
  });
});
