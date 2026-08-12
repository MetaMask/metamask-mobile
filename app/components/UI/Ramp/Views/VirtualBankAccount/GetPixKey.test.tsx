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

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

describe('GetPixKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
