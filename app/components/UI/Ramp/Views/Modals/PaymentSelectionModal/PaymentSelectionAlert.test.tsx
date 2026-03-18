import React from 'react';
import { render } from '@testing-library/react-native';
import PaymentSelectionAlert from './PaymentSelectionAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';

describe('PaymentSelectionAlert', () => {
  it('matches snapshot with default severity', () => {
    const component = render(
      <PaymentSelectionAlert message="Something went wrong." />,
    );
    expect(component).toMatchSnapshot();
  });

  it('matches snapshot with warning severity', () => {
    const component = render(
      <PaymentSelectionAlert
        message="No payment methods are available."
        severity={BannerAlertSeverity.Warning}
      />,
    );
    expect(component).toMatchSnapshot();
  });
});
