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

  it('shows the legal links regardless of the data and privacy toggle state', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <VbaVerifyIdentity />,
    );

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DATA_AND_PRIVACY_TOGGLE),
    );

    // Legal links are their own always-visible section, unaffected by the
    // "Data and privacy" toggle above them.
    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK),
    ).toBeOnTheScreen();
  });

  it('shows the data and privacy sub-topics expanded by default, and hides them when collapsed', () => {
    const { getByText, queryByText, getByTestId } = renderWithProvider(
      <VbaVerifyIdentity />,
    );

    expect(getByText('What we collect')).toBeOnTheScreen();
    expect(getByText('How we store data')).toBeOnTheScreen();
    expect(getByText('How to delete')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DATA_AND_PRIVACY_TOGGLE),
    );

    expect(queryByText('What we collect')).not.toBeOnTheScreen();
    expect(queryByText('How we store data')).not.toBeOnTheScreen();
    expect(queryByText('How to delete')).not.toBeOnTheScreen();
  });

  it('collapses an individual sub-topic without affecting the others', () => {
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <VbaVerifyIdentity />,
    );

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.WHAT_WE_COLLECT_TOGGLE),
    );

    expect(
      queryByText(
        'We collect personal information as part of identity verification, including legal full name, address, and more.',
      ),
    ).not.toBeOnTheScreen();
    expect(getByText('How we store data')).toBeOnTheScreen();
    expect(
      getByText(
        'You can delete your data anytime by going to Settings > Manage data.',
      ),
    ).toBeOnTheScreen();
  });

  it('opens each legal link with the expected URL', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByTestId } = renderWithProvider(<VbaVerifyIdentity />);

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
