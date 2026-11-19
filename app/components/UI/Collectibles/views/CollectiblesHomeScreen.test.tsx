import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { CollectiblesHomeScreen } from './CollectiblesHomeScreen';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

describe('CollectiblesHomeScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('shows the placeholder title and message', () => {
    render(<CollectiblesHomeScreen />);

    expect(
      screen.getByText(strings('collectibles.placeholder.main')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.placeholder.coming_soon')),
    ).toBeOnTheScreen();
  });

  it('goes back when the back button is pressed', () => {
    render(<CollectiblesHomeScreen />);

    fireEvent.press(screen.getByTestId('button-icon'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
