import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaVerifyIdentity from './VerifyIdentity';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import {
  IDOS_PRIVACY_POLICY_URL,
  IDOS_TERMS_URL,
  METAMASK_PRIVACY_POLICY_URL,
  METAMASK_TERMS_URL,
  SUMSUB_PRIVACY_POLICY_URL,
  SUMSUB_TERMS_URL,
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

describe('VbaVerifyIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, steps, and continue button', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <VbaVerifyIdentity />,
    );

    expect(getByText('Verify your identity')).toBeOnTheScreen();
    expect(getByText('Upload ID document')).toBeOnTheScreen();
    expect(getByText('Take a selfie')).toBeOnTheScreen();
    expect(getByText('Confirm personal details')).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<VbaVerifyIdentity />);

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('does not show the data and privacy links until toggled', () => {
    const { queryByTestId, getByTestId } = renderWithProvider(
      <VbaVerifyIdentity />,
    );

    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DATA_AND_PRIVACY_TOGGLE),
    );

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK),
    ).toBeOnTheScreen();
  });

  it('opens each legal link with the expected URL once expanded', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByTestId } = renderWithProvider(<VbaVerifyIdentity />);

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DATA_AND_PRIVACY_TOGGLE),
    );

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK),
    );
    expect(spy).toHaveBeenCalledWith(METAMASK_PRIVACY_POLICY_URL);

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK),
    );
    expect(spy).toHaveBeenCalledWith(METAMASK_TERMS_URL);

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.IDOS_PRIVACY_POLICY_LINK),
    );
    expect(spy).toHaveBeenCalledWith(IDOS_PRIVACY_POLICY_URL);

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.IDOS_TERMS_LINK));
    expect(spy).toHaveBeenCalledWith(IDOS_TERMS_URL);

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.SUMSUB_PRIVACY_POLICY_LINK),
    );
    expect(spy).toHaveBeenCalledWith(SUMSUB_PRIVACY_POLICY_URL);

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.SUMSUB_TERMS_LINK),
    );
    expect(spy).toHaveBeenCalledWith(SUMSUB_TERMS_URL);
  });
});
