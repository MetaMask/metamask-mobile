import { IconName } from '@metamask/design-system-react-native';
import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TypeFilterSelector, TypeFilterSheet } from './TypeFilter';
import {
  TypeFilterSelectorsIDs,
  getTypeFilterOptionTestId,
} from './Filters.testIds';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../../util/haptics', () => ({
  playSelection: () => mockPlaySelection(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('TypeFilterSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the "all" label when the all type is selected', () => {
    renderWithProvider(<TypeFilterSelector value="all" onPress={jest.fn()} />);

    expect(
      screen.getByText('social_leaderboard.type_filter.all'),
    ).toBeOnTheScreen();
  });

  it('renders the selected type label', () => {
    renderWithProvider(
      <TypeFilterSelector value="perps" onPress={jest.fn()} />,
    );

    expect(
      screen.getByText('social_leaderboard.type_filter.perps'),
    ).toBeOnTheScreen();
  });

  it('calls onPress when the pill is pressed', () => {
    const onPress = jest.fn();
    renderWithProvider(<TypeFilterSelector value="all" onPress={onPress} />);

    fireEvent.press(screen.getByTestId(TypeFilterSelectorsIDs.SELECTOR));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('supports a custom testID', () => {
    renderWithProvider(
      <TypeFilterSelector value="tokens" onPress={jest.fn()} testID="custom" />,
    );

    expect(screen.getByTestId('custom')).toBeOnTheScreen();
  });
});

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

  it('marks the selected type with a check and leaves the other rows unmarked', () => {
    renderWithProvider(
      <TypeFilterSheet
        isOpen
        value="all"
        onChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const selected = screen.getByTestId(getTypeFilterOptionTestId('all'));
    const unselected = screen.getByTestId(getTypeFilterOptionTestId('tokens'));

    expect(selected).toHaveProp('accessibilityState', { selected: true });
    expect(unselected).toHaveProp('accessibilityState', { selected: false });
    expect(
      within(selected).UNSAFE_getAllByProps({ name: IconName.Check }).length,
    ).toBeGreaterThan(0);
    expect(
      within(unselected).UNSAFE_queryAllByProps({ name: IconName.Check }),
    ).toHaveLength(0);
  });
});
