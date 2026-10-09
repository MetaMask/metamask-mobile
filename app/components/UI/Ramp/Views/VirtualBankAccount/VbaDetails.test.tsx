import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaDetails, { VbaDetailsSelectorsIDs } from './VbaDetails';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('VbaDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the details screen', () => {
    const { getByTestId, getByText } = renderWithProvider(<VbaDetails />);

    expect(getByTestId(VbaDetailsSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.HEADER)).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.LOGO)).toBeOnTheScreen();
    expect(getByText('Add money with Pix')).toBeOnTheScreen();
    expect(getByText('PIX Copia e Cola')).toBeOnTheScreen();
    expect(getByText('PIX key')).toBeOnTheScreen();
    expect(getByText('XXXXXXXX-XXXX-XXXX')).toBeOnTheScreen();
  });

  it('copies a sample Pix value', () => {
    const { getByTestId } = renderWithProvider(<VbaDetails />);

    fireEvent.press(
      getByTestId(`${VbaDetailsSelectorsIDs.COPY_BUTTON}-pix-key`),
    );

    expect(Clipboard.setString).toHaveBeenCalledWith('XXXXXXXX-XXXX-XXXX');
  });

  it('navigates to Money home when done is pressed', () => {
    const { getByTestId } = renderWithProvider(<VbaDetails />);

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.DONE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });
});
