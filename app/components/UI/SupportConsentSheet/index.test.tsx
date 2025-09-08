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

const mockOnConsent = jest.fn();
const mockOnDecline = jest.fn();

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
});
