import React from 'react';
import { render } from '@testing-library/react-native';
import PaymentSelectionAlert from './PaymentSelectionAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';

describe('PaymentSelectionAlert', () => {
  it('matches snapshot with default severity', () => {
    const { toJSON } = render(
      <PaymentSelectionAlert message="Something went wrong." />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot with warning severity', () => {
    const { toJSON } = render(
      <PaymentSelectionAlert
        message="No payment methods are available."
        severity={BannerAlertSeverity.Warning}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
