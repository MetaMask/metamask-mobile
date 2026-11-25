import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { MembershipInfo } from './membership-info';

describe('MembershipInfo', () => {
  it.each([
    ['5', '$5.00'],
    ['1234.56', '$1,234.56'],
    ['', '$0.00'],
  ])(
    'renders amount %s as %s in an info banner',
    (amountFiat, formattedAmount) => {
      const { getByText, UNSAFE_getByType } = renderWithProvider(
        <MembershipInfo amountFiat={amountFiat} />,
      );

      expect(
        getByText(
          `We’ll add ${formattedAmount} to your Money account to cover this payment.`,
        ),
      ).toBeOnTheScreen();
      expect(UNSAFE_getByType(BannerAlert).props.severity).toBe(
        BannerAlertSeverity.Info,
      );
    },
  );

  it('updates the banner when the deposit amount changes', () => {
    const { getByText, rerender } = renderWithProvider(
      <MembershipInfo amountFiat="5" />,
    );

    rerender(<MembershipInfo amountFiat="10" />);

    expect(
      getByText(
        'We’ll add $10.00 to your Money account to cover this payment.',
      ),
    ).toBeOnTheScreen();
  });
});
