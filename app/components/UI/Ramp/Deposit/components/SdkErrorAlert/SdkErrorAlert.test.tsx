import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SdkErrorAlert from './SdkErrorAlert';
import { strings } from '../../../../../../../locales/i18n';

describe('SdkErrorAlert', () => {
  it('renders nothing when error is null', () => {
    const { toJSON } = render(
      <SdkErrorAlert error={null} errorType="regions" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders regions error message', () => {
    render(
      <SdkErrorAlert
        error="Some error"
        errorType="regions"
        onRetry={jest.fn()}
      />,
    );
    expect(
      screen.getByText(strings('deposit.errors.fetch_regions')),
    ).toBeOnTheScreen();
  });

  it('renders tokens error message', () => {
    render(
      <SdkErrorAlert
        error="Some error"
        errorType="tokens"
        onRetry={jest.fn()}
      />,
    );
    expect(
      screen.getByText(strings('deposit.errors.fetch_tokens')),
    ).toBeOnTheScreen();
  });

  it('renders payment methods error message', () => {
    render(
      <SdkErrorAlert
        error="Some error"
        errorType="paymentMethods"
        onRetry={jest.fn()}
      />,
    );
    expect(
      screen.getByText(strings('deposit.errors.fetch_payment_methods')),
    ).toBeOnTheScreen();
  });

  it('renders user details error message', () => {
    render(
      <SdkErrorAlert
        error="Some error"
        errorType="userDetails"
        onRetry={jest.fn()}
      />,
    );
    expect(
      screen.getByText(strings('deposit.errors.fetch_user_details')),
    ).toBeOnTheScreen();
  });

  it('calls onRetry when retry button is pressed', () => {
    const mockRetry = jest.fn();
    render(
      <SdkErrorAlert
        error="Some error"
        errorType="regions"
        onRetry={mockRetry}
      />,
    );

    const retryButton = screen.getByText(strings('deposit.errors.try_again'));
    fireEvent.press(retryButton);

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('disables retry button when isRetrying is true', () => {
    const mockRetry = jest.fn();
    render(
      <SdkErrorAlert
        error="Some error"
        errorType="regions"
        onRetry={mockRetry}
        isRetrying
      />,
    );

    expect(
      screen.getByRole('link', { name: strings('deposit.errors.try_again') }),
    ).toBeOnTheScreen();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<SdkErrorAlert error="Some error" errorType="regions" />);
    expect(
      screen.queryByText(strings('deposit.errors.try_again')),
    ).not.toBeOnTheScreen();
  });
});
