import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import GetPixKey from './GetPixKey';
import { GetPixKeySelectorsIDs } from './GetPixKey.testIds';
import {
  MOONPAY_PRIVACY_POLICY_URL,
  MOONPAY_TERMS_URL,
  TRACE_TERMS_URL,
} from './constants';
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
    expect(getByText('Earn up to 4% APY on your balance')).toBeOnTheScreen();
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

  it('opens the MoonPay privacy policy link', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    fireEvent.press(
      getByTestId(GetPixKeySelectorsIDs.MOONPAY_PRIVACY_POLICY_LINK),
    );

    expect(spy).toHaveBeenCalledWith(MOONPAY_PRIVACY_POLICY_URL);
  });

  it('opens the MoonPay terms link', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    fireEvent.press(getByTestId(GetPixKeySelectorsIDs.MOONPAY_TERMS_LINK));

    expect(spy).toHaveBeenCalledWith(MOONPAY_TERMS_URL);
  });

  it('opens the Trace terms link', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByTestId } = renderWithProvider(<GetPixKey />);

    fireEvent.press(getByTestId(GetPixKeySelectorsIDs.TRACE_TERMS_LINK));

    expect(spy).toHaveBeenCalledWith(TRACE_TERMS_URL);
  });

  it('renders disclaimers from the KYC API instead of the static links when available', () => {
    mockUseKycDisclaimers.mockReturnValue({
      disclaimers: [
        { id: 'd-1', url: 'https://iron.example/tc', display_name: 'Iron T&C' },
      ],
      isLoading: false,
      error: null,
    });
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByText, queryByText } = renderWithProvider(<GetPixKey />);

    expect(getByText('Iron T&C')).toBeOnTheScreen();
    expect(queryByText('MoonPay Terms and Conditions')).not.toBeOnTheScreen();

    fireEvent.press(getByText('Iron T&C'));

    expect(spy).toHaveBeenCalledWith('https://iron.example/tc');
  });
});
