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
const mockRetry = jest.fn();

const loadedDisclaimer = {
  id: 'd-1',
  url: 'https://iron.example/tc',
  display_name: 'Iron T&C',
};

describe('GetPixKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [loadedDisclaimer],
      isLoading: false,
      error: null,
      retry: mockRetry,
    });
  });

  it('renders the title, benefits, and agree and continue button', () => {
    const { getByText, getByTestId } = renderWithProvider(<GetPixKey />);

    expect(getByText('Get your Pix Key')).toBeOnTheScreen();
    expect(getByText('Deposit with')).toBeOnTheScreen();
    expect(getByText('pix')).toBeOnTheScreen();
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

  it('navigates to the verify identity screen when agree and continue is pressed after disclaimers load', () => {
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    const button = getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON);
    expect(button).toBeEnabled();

    fireEvent.press(button);
    expect(mockNavigate).toHaveBeenCalledWith('RampVbaVerifyIdentity');
  });

  it('shows a skeleton loader instead of any disclaimer links while the fetch is in flight, and disables the CTA', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [],
      isLoading: true,
      error: null,
      retry: mockRetry,
    });

    const { getByTestId } = renderWithProvider(<GetPixKey />);

    expect(
      getByTestId(GetPixKeySelectorsIDs.DISCLAIMERS_LOADING),
    ).toBeOnTheScreen();
    expect(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    ).toBeDisabled();
  });

  it('renders no disclaimer links and disables the CTA when the fetch comes back empty and is not loading', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [],
      isLoading: false,
      error: null,
      retry: mockRetry,
    });

    const { queryByTestId, getByTestId } = renderWithProvider(<GetPixKey />);

    expect(
      queryByTestId(GetPixKeySelectorsIDs.DISCLAIMERS_LOADING),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(`${GetPixKeySelectorsIDs.DISCLAIMER_LINK}-d-1`),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    ).toBeDisabled();
  });

  it('renders disclaimers from the KYC API and opens their URL when pressed', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByText } = renderWithProvider(<GetPixKey />);

    expect(getByText('Iron T&C')).toBeOnTheScreen();

    fireEvent.press(getByText('Iron T&C'));

    expect(spy).toHaveBeenCalledWith('https://iron.example/tc');
  });

  it('shows an error with a retry action and keeps the CTA disabled when the fetch fails', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [],
      isLoading: false,
      error: 'Request timed out',
      retry: mockRetry,
    });

    const { getByTestId, getByText } = renderWithProvider(<GetPixKey />);

    expect(
      getByTestId(GetPixKeySelectorsIDs.DISCLAIMERS_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    ).toBeDisabled();

    fireEvent.press(getByText('Try again'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
