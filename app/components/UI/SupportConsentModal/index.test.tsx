import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SupportConsentModal from './index';
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

describe('SupportConsentModal', () => {
  const mockOnConsent = jest.fn();
  const mockOnDecline = jest.fn();
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('displays consent modal when visible', () => {
    // Given the modal is set to visible
    const isVisible = true;

    // When the modal is rendered
    const { getByText } = render(
      <SupportConsentModal
        isVisible={isVisible}
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />
    );

    // Then all consent modal elements should be displayed
    expect(getByText(strings('support_consent.title'))).toBeOnTheScreen();
    expect(getByText(strings('support_consent.description'))).toBeOnTheScreen();
    expect(getByText(strings('support_consent.consent'))).toBeOnTheScreen();
    expect(getByText(strings('support_consent.decline'))).toBeOnTheScreen();
  });

  it('hides modal when not visible', () => {
    // Given the modal is set to not visible
    const isVisible = false;

    // When the modal is rendered
    const { queryByText } = render(
      <SupportConsentModal
        isVisible={isVisible}
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />
    );

    // Then the modal title should not be displayed
    expect(queryByText(strings('support_consent.title'))).not.toBeOnTheScreen();
  });

  it('calls onConsent when user agrees to share information', () => {
    // Given the modal is visible
    const { getByText } = render(
      <SupportConsentModal
        isVisible={true}
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />
    );

    // When the user presses the consent button
    fireEvent.press(getByText(strings('support_consent.consent')));

    // Then the onConsent callback should be called once
    expect(mockOnConsent).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline when user declines to share information', () => {
    // Given the modal is visible
    const { getByText } = render(
      <SupportConsentModal
        isVisible={true}
        onConsent={mockOnConsent}
        onDecline={mockOnDecline}
      />
    );

    // When the user presses the decline button
    fireEvent.press(getByText(strings('support_consent.decline')));

    // Then the onDecline callback should be called once
    expect(mockOnDecline).toHaveBeenCalledTimes(1);
  });
}); 