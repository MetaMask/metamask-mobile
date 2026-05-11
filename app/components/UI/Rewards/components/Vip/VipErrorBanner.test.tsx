import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import VipErrorBanner from './VipErrorBanner';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => `i18n(${key})`,
}));

describe('VipErrorBanner', () => {
  it('renders the VIP error strings and forwards the testID', () => {
    const { getByText, getByTestId } = render(
      <VipErrorBanner onRetry={jest.fn()} testID="vip-error" />,
    );

    expect(getByTestId('vip-error')).toBeOnTheScreen();
    expect(getByText('i18n(rewards.vip.error_title)')).toBeOnTheScreen();
    expect(getByText('i18n(rewards.vip.error_description)')).toBeOnTheScreen();
    expect(getByText('i18n(rewards.vip.retry_button)')).toBeOnTheScreen();
  });

  it('invokes onRetry when the retry button is pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <VipErrorBanner onRetry={onRetry} testID="vip-error" />,
    );

    fireEvent.press(getByText('i18n(rewards.vip.retry_button)'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
