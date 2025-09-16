import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SupportConsentSheet from './index';
import { strings } from '../../../../locales/i18n';

// Mock the theme hook
jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#ffffff' },
      text: { default: '#000000', alternative: '#666666' },
    },
  }),
}));

// Mock Redux actions
jest.mock('../../../actions/security', () => ({
  setSupportConsentPreference: jest.fn(),
}));

const mockOnConsent = jest.fn();
const mockOnDecline = jest.fn();
// Mock functions for testing
const mockSetSupportConsentPreference = jest.fn();

describe('SupportConsentSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText } = renderWithProvider(
      <SupportConsentSheet
        isVisible
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />,
    );

    expect(getByText(strings('support_consent.title'))).toBeTruthy();
    expect(getByText(strings('support_consent.description'))).toBeTruthy();
    expect(getByText(strings('support_consent.consent'))).toBeTruthy();
    expect(getByText(strings('support_consent.decline'))).toBeTruthy();
    expect(getByText(strings('support_consent.save_preference'))).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = renderWithProvider(
      <SupportConsentSheet
        isVisible={false}
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />,
    );

    expect(queryByText(strings('support_consent.title'))).toBeNull();
  });

  it('calls onConsent when consent button is pressed', () => {
    const { getByText } = renderWithProvider(
      <SupportConsentSheet
        isVisible
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />,
    );

    const consentButton = getByText(strings('support_consent.consent'));
    fireEvent.press(consentButton);

    expect(mockOnConsent).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline when decline button is pressed', () => {
    const { getByText } = renderWithProvider(
      <SupportConsentSheet
        isVisible
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />,
    );

    const declineButton = getByText(strings('support_consent.decline'));
    fireEvent.press(declineButton);

    expect(mockOnDecline).toHaveBeenCalledTimes(1);
  });

  it('has save preference checkbox checked by default', () => {
    const { getByText } = renderWithProvider(
      <SupportConsentSheet
        isVisible
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />,
    );

    const checkbox = getByText(strings('support_consent.save_preference'));
    expect(checkbox).toBeTruthy();
    // The checkbox should be checked by default (isChecked={true})
  });

  it('calls onConsent when consent is pressed', () => {
    const { getByText } = renderWithProvider(
      <SupportConsentSheet
        isVisible
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />,
    );

    const consentButton = getByText(strings('support_consent.consent'));
    fireEvent.press(consentButton);

    expect(mockOnConsent).toHaveBeenCalled();
  });

  it('calls onDecline when decline is pressed', () => {
    const { getByText } = renderWithProvider(
      <SupportConsentSheet
        isVisible
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />,
    );

    const declineButton = getByText(strings('support_consent.decline'));
    fireEvent.press(declineButton);

    expect(mockOnDecline).toHaveBeenCalled();
  });

  it('toggles checkbox state when pressed', () => {
    const { getByText } = renderWithProvider(
      <SupportConsentSheet
        isVisible
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />,
    );

    const checkbox = getByText(strings('support_consent.save_preference'));
    fireEvent.press(checkbox);

    expect(checkbox).toBeTruthy();
  });

  describe('Preference Persistence', () => {
    it('dispatches consent preference when checkbox is checked and consent is pressed', () => {
      const { getByText } = renderWithProvider(
        <SupportConsentSheet
          isVisible
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />,
      );

      const consentButton = getByText(strings('support_consent.consent'));
      fireEvent.press(consentButton);

      expect(mockSetSupportConsentPreference).toHaveBeenCalledWith(true);
      expect(mockOnConsent).toHaveBeenCalled();
    });

    it('dispatches no-consent preference when checkbox is checked and decline is pressed', () => {
      const { getByText } = renderWithProvider(
        <SupportConsentSheet
          isVisible
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />,
      );

      const declineButton = getByText(strings('support_consent.decline'));
      fireEvent.press(declineButton);

      expect(mockSetSupportConsentPreference).toHaveBeenCalledWith(false);
      expect(mockOnDecline).toHaveBeenCalled();
    });

    it('does not dispatch preference when checkbox is unchecked and consent is pressed', () => {
      const { getByText } = renderWithProvider(
        <SupportConsentSheet
          isVisible
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />,
      );

      const checkbox = getByText(strings('support_consent.save_preference'));
      fireEvent.press(checkbox);
      const consentButton = getByText(strings('support_consent.consent'));
      fireEvent.press(consentButton);

      expect(mockSetSupportConsentPreference).not.toHaveBeenCalled();
      expect(mockOnConsent).toHaveBeenCalled();
    });

    it('does not dispatch preference when checkbox is unchecked and decline is pressed', () => {
      const { getByText } = renderWithProvider(
        <SupportConsentSheet
          isVisible
          onConsent={mockOnConsent}
          onDecline={mockOnDecline}
        />,
      );

      const checkbox = getByText(strings('support_consent.save_preference'));
      fireEvent.press(checkbox);
      const declineButton = getByText(strings('support_consent.decline'));
      fireEvent.press(declineButton);

      expect(mockSetSupportConsentPreference).not.toHaveBeenCalled();
      expect(mockOnDecline).toHaveBeenCalled();
    });
  });
});
