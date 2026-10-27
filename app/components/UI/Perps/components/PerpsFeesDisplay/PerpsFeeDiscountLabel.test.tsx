import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { MembershipVipBadgeSelectorsIDs } from '../../../shared/MembershipVipBadge/MembershipVipBadge';
import { PerpsFeeDiscountLabelSelectorsIDs } from '../../Perps.testIds';
import PerpsFeeDiscountLabel from './PerpsFeeDiscountLabel';

jest.mock('../../../Rewards/hooks/useVipTier', () => ({
  useVipTier: () => 1,
}));

describe('PerpsFeeDiscountLabel', () => {
  it('renders verified VIP treatment for rewards attribution', () => {
    render(
      <PerpsFeeDiscountLabel
        feeDiscountPercentage={75}
        feeDiscountKind="vip"
      />,
    );

    expect(
      screen.getByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).toBeOnTheScreen();
  });

  it('renders member treatment for subscription attribution', () => {
    render(
      <PerpsFeeDiscountLabel
        feeDiscountPercentage={75}
        feeDiscountKind="member"
      />,
    );

    expect(
      screen.getByTestId(MembershipVipBadgeSelectorsIDs.MEMBER_BADGE),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('renders the promo seal without VIP treatment for a grant', () => {
    render(
      <PerpsFeeDiscountLabel
        feeDiscountPercentage={75}
        feeDiscountKind="promotional"
      />,
    );

    expect(
      screen.getByTestId(PerpsFeeDiscountLabelSelectorsIDs.LABEL),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.tooltips.fees.promotional_discount')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByLabelText(
        strings('perps.tooltips.fees.promotional_discount'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('names the promo seal when it is the only discount indicator', () => {
    render(
      <PerpsFeeDiscountLabel
        feeDiscountPercentage={75}
        feeDiscountKind="promotional"
        accessibilityLabel={strings('perps.tooltips.fees.promotional_discount')}
      />,
    );

    expect(
      screen.getByLabelText(
        strings('perps.tooltips.fees.promotional_discount'),
      ),
    ).toBeOnTheScreen();
  });

  it('renders generic copy for unknown attribution', () => {
    render(<PerpsFeeDiscountLabel feeDiscountPercentage={75} />);

    expect(
      screen.getByText(strings('perps.tooltips.fees.fee_discount')),
    ).toBeOnTheScreen();
  });

  it('renders nothing when no reduction occurred', () => {
    const { toJSON } = render(
      <PerpsFeeDiscountLabel feeDiscountPercentage={0} feeDiscountKind="vip" />,
    );

    expect(toJSON()).toBeNull();
  });
});
