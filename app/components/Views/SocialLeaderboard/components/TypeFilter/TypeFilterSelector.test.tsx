import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TypeFilterSelector from './TypeFilterSelector';
import { TypeFilterSelectorsIDs } from './TypeFilter.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('TypeFilterSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the selector pill with the current value label', () => {
    renderWithProvider(<TypeFilterSelector value="all" onPress={jest.fn()} />);

    expect(
      screen.getByTestId(TypeFilterSelectorsIDs.SELECTOR),
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
