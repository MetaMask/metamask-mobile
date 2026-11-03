import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import StandaloneSupportConsentModal from './StandaloneSupportConsentModal';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';

describe('StandaloneSupportConsentModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnReject = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and description when visible', () => {
    const { getByText } = renderWithProvider(
      <StandaloneSupportConsentModal
        visible
        onConfirm={mockOnConfirm}
        onReject={mockOnReject}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(getByText(strings('support_consent.title'))).toBeOnTheScreen();
    expect(getByText(strings('support_consent.description'))).toBeOnTheScreen();
  });

  it('renders the "Save my preference" checkbox checked by default', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <StandaloneSupportConsentModal
        visible
        onConfirm={mockOnConfirm}
        onReject={mockOnReject}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(
      getByText(strings('support_consent.save_preference')),
    ).toBeOnTheScreen();
    expect(
      getByTestId('standalone-support-consent-save-preference-checkbox'),
    ).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ checked: true }),
    );
  });

  it('calls onConfirm when the confirm button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <StandaloneSupportConsentModal
        visible
        onConfirm={mockOnConfirm}
        onReject={mockOnReject}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent.press(getByTestId('standalone-support-consent-confirm-button'));

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnReject).not.toHaveBeenCalled();
  });

  it('saves the share preference when confirming with "Save my preference" checked', () => {
    const { getByTestId, store } = renderWithProvider(
      <StandaloneSupportConsentModal
        visible
        onConfirm={mockOnConfirm}
        onReject={mockOnReject}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent.press(getByTestId('standalone-support-consent-confirm-button'));

    expect(store.getState().security.shouldShowConsentSheet).toBe(false);
    expect(store.getState().security.dataSharingPreference).toBe(true);
  });

  it('calls onReject when the reject button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <StandaloneSupportConsentModal
        visible
        onConfirm={mockOnConfirm}
        onReject={mockOnReject}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent.press(getByTestId('standalone-support-consent-reject-button'));

    expect(mockOnReject).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('saves the do-not-share preference when rejecting with "Save my preference" checked', () => {
    const { getByTestId, store } = renderWithProvider(
      <StandaloneSupportConsentModal
        visible
        onConfirm={mockOnConfirm}
        onReject={mockOnReject}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent.press(getByTestId('standalone-support-consent-reject-button'));

    expect(store.getState().security.shouldShowConsentSheet).toBe(false);
    expect(store.getState().security.dataSharingPreference).toBe(false);
  });

  it('does not save a preference when "Save my preference" is unchecked', () => {
    const { getByTestId, store } = renderWithProvider(
      <StandaloneSupportConsentModal
        visible
        onConfirm={mockOnConfirm}
        onReject={mockOnReject}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent.press(
      getByTestId('standalone-support-consent-save-preference-checkbox'),
    );
    fireEvent.press(getByTestId('standalone-support-consent-confirm-button'));

    expect(store.getState().security.shouldShowConsentSheet).toBe(true);
    expect(store.getState().security.dataSharingPreference).toBeNull();
  });

  it('calls onDismiss when the modal is closed without a button press', () => {
    const { getByTestId } = renderWithProvider(
      <StandaloneSupportConsentModal
        visible
        onConfirm={mockOnConfirm}
        onReject={mockOnReject}
        onDismiss={mockOnDismiss}
      />,
    );

    fireEvent(
      getByTestId('standalone-support-consent-modal'),
      'onRequestClose',
    );

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
    expect(mockOnReject).not.toHaveBeenCalled();
  });

  it('renders without a ThemeProvider (no ancestor theme context)', () => {
    expect(() =>
      renderWithProvider(
        <StandaloneSupportConsentModal
          visible
          onConfirm={mockOnConfirm}
          onReject={mockOnReject}
          onDismiss={mockOnDismiss}
        />,
      ),
    ).not.toThrow();
  });
});
