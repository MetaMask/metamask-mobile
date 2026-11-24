import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
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

  it('shows the Collectibles header', () => {
    renderWithProvider(<CollectiblesHomeScreen />);

    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
  });

  it('goes back when the back button is pressed', () => {
    renderWithProvider(<CollectiblesHomeScreen />);

    // The design-system back button's default testID.
    fireEvent.press(screen.getByTestId('button-icon'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
