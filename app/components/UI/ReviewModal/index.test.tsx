import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ReviewModal from './index';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

const mockOpenSupportWithConsent = jest.fn(
  (open: (url: string) => void, baseUrl?: string) => open(baseUrl ?? ''),
);
jest.mock('../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

describe('ReviewModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the support consent sheet with the review-prompt support URL when the contact-support link is pressed', () => {
    const { getByText } = renderWithProvider(<ReviewModal />);

    fireEvent.press(getByText(strings('review_prompt.sentiment_bad')));
    fireEvent.press(getByText(strings('review_prompt.help_description_2')));

    expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
      expect.any(Function),
      AppConstants.REVIEW_PROMPT.SUPPORT,
    );
  });

  it('navigates to the SimpleWebview with the resolved support URL when the opener resolves', () => {
    const { getByText } = renderWithProvider(<ReviewModal />);

    fireEvent.press(getByText(strings('review_prompt.sentiment_bad')));
    fireEvent.press(getByText(strings('review_prompt.help_description_2')));

    // The mock auto-invokes `open` with the base URL as soon as
    // openSupportWithConsent is called, so navigate has already been called
    // once before this point; re-invoking `open` here simulates the sheet
    // resolving with the token-enriched URL, which lands as the last call.
    const [open] = mockOpenSupportWithConsent.mock.calls[0];
    open('https://support.metamask.io/?customer_service_token=jwt-token');

    expect(mockNavigate).toHaveBeenLastCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/?customer_service_token=jwt-token',
      },
    });
  });
});
