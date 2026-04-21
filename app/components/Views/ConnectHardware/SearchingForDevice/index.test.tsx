import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SearchingForDevice from './index';
import { AppThemeKey } from '../../../../util/theme/models';

const initialState = {
  user: {
    appTheme: AppThemeKey.dark,
  },
};

describe('SearchingForDevice', () => {
  it('renders the Figma loading copy', () => {
    renderWithProvider(<SearchingForDevice />, { state: initialState });

    expect(screen.getByText('Looking for your device')).toBeTruthy();
    expect(screen.getByText('Hold on while we search for it...')).toBeTruthy();
    expect(
      screen.getByTestId('hardware-wallet-searching-content'),
    ).toBeTruthy();
  });
});
