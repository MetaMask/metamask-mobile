import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaDetails, { VbaDetailsSelectorsIDs } from './VbaDetails';
import Routes from '../../../../../constants/navigation/Routes';

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
    const { getByTestId } = renderWithProvider(<VbaDetails />);

    expect(getByTestId(VbaDetailsSelectorsIDs.CONTAINER)).toBeOnTheScreen();
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
