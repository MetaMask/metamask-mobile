import React from 'react';
import { render } from '@testing-library/react-native';
import ShareCodeSheet from './ShareCodeSheet';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-native-qrcode-svg', () => () => null);

jest.mock('../../utils', () => ({
  buildReferralUrl: (code: string) =>
    `https://link.metamask.io/rewards?c=${code}`,
}));

describe('ShareCodeSheet', () => {
  it('returns nothing when hidden', () => {
    const { queryByTestId } = render(
      <ShareCodeSheet
        isVisible={false}
        referralCode="8F3A21"
        onClose={jest.fn()}
      />,
    );

    expect(queryByTestId(KOL_DASHBOARD_SELECTORS.SHARE_SHEET)).toBeNull();
  });
});
