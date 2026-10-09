import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
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

    expect(screen.getByTestId('rewards-vip-badge')).toBeOnTheScreen();
  });

  it('renders promotional copy without VIP treatment for a grant', () => {
    render(
      <PerpsFeeDiscountLabel
        feeDiscountPercentage={75}
        feeDiscountKind="promotional"
      />,
    );

    expect(
      screen.getByText(strings('perps.tooltips.fees.promotional_discount')),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('rewards-vip-badge')).not.toBeOnTheScreen();
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
