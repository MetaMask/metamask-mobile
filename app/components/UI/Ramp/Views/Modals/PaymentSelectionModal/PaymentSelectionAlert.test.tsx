import React from 'react';
import { render } from '@testing-library/react-native';
import PaymentSelectionAlert from './PaymentSelectionAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';

describe('PaymentSelectionAlert', () => {
  it('renders error message with default severity', () => {
    const { getByText } = render(
      <PaymentSelectionAlert message="Something went wrong." />,
    );
    expect(getByText('Something went wrong.')).toBeOnTheScreen();
  });

  it('renders message with warning severity', () => {
    const { getByText } = render(
      <PaymentSelectionAlert
        message="No payment methods are available."
        severity={BannerAlertSeverity.Warning}
      />,
    );
    expect(getByText('No payment methods are available.')).toBeOnTheScreen();
  });
});
