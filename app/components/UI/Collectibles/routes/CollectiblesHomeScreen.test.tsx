import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '../Collectibles.testIds';
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

    fireEvent.press(screen.getByTestId(collectiblesTestIds.homeBackButton));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
