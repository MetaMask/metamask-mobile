import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MockKycSuccess from './MockKycSuccess';
import { MockKycSuccessSelectorsIDs } from './MockKycSuccess.testIds';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

describe('MockKycSuccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to Money home when Finish is pressed', () => {
    const { getByTestId } = renderWithProvider(<MockKycSuccess />);

    fireEvent.press(getByTestId(MockKycSuccessSelectorsIDs.FINISH_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith('Home', {
      screen: 'MoneyScreens',
      params: { screen: 'MoneyHome' },
    });
  });
});
