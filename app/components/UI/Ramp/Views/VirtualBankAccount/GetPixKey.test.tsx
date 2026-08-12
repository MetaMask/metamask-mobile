import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import GetPixKey from './GetPixKey';
import { GetPixKeySelectorsIDs } from './GetPixKey.testIds';
import { useKycDisclaimers } from './hooks/useKycDisclaimers';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('./hooks/useKycDisclaimers');
const mockUseKycDisclaimers = jest.mocked(useKycDisclaimers);

describe('GetPixKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [],
      isLoading: false,
      error: null,
    });
  });

  it('renders the title, benefits, and agree and continue button', () => {
    const { getByText, getByTestId } = renderWithProvider(<GetPixKey />);

    expect(getByText('Get your Pix Key')).toBeOnTheScreen();
    expect(getByText('Deposit with')).toBeOnTheScreen();
    expect(
      getByText('Send local and international payments'),
    ).toBeOnTheScreen();
    expect(getByText('Powered by MoonPay.')).toBeOnTheScreen();
    expect(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    fireEvent.press(getByTestId(GetPixKeySelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to the verify identity screen when agree and continue is pressed', () => {
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    fireEvent.press(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith('RampVbaVerifyIdentity');
  });

  it('shows a loading indicator instead of any disclaimer links while the fetch is in flight', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [],
      isLoading: true,
      error: null,
    });

    const { getByTestId } = renderWithProvider(<GetPixKey />);

    expect(
      getByTestId(GetPixKeySelectorsIDs.DISCLAIMERS_LOADING),
    ).toBeOnTheScreen();
  });

  it('renders no disclaimer links when the fetch comes back empty and is not loading', () => {
    const { queryByTestId } = renderWithProvider(<GetPixKey />);

    expect(
      queryByTestId(GetPixKeySelectorsIDs.DISCLAIMERS_LOADING),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(`${GetPixKeySelectorsIDs.DISCLAIMER_LINK}-d-1`),
    ).not.toBeOnTheScreen();
  });

  it('renders disclaimers from the KYC API and opens their URL when pressed', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [
        { id: 'd-1', url: 'https://iron.example/tc', display_name: 'Iron T&C' },
      ],
      isLoading: false,
      error: null,
    });
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByText } = renderWithProvider(<GetPixKey />);

    expect(getByText('Iron T&C')).toBeOnTheScreen();

    fireEvent.press(getByText('Iron T&C'));

    expect(spy).toHaveBeenCalledWith('https://iron.example/tc');
  });
});
