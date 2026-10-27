import React from 'react';
import { render } from '@testing-library/react-native';
import { MembershipVipBadgeSelectorsIDs } from '../../../shared/MembershipVipBadge/MembershipVipBadge';
import { PerpsFeeDiscountLabelSelectorsIDs } from '../../Perps.testIds';
import PerpsFeesDisplay from './PerpsFeesDisplay';

jest.mock('../../../shared/MembershipVipBadge/MembershipVipBadge', () => {
  const actual = jest.requireActual<
    typeof import('../../../shared/MembershipVipBadge/MembershipVipBadge')
  >('../../../shared/MembershipVipBadge/MembershipVipBadge');
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    __esModule: true,
    default: ({ hasProEntitlement }: { hasProEntitlement?: boolean }) =>
      MockReact.createElement(View, {
        testID: hasProEntitlement
          ? actual.MembershipVipBadgeSelectorsIDs.MEMBER_BADGE
          : actual.MembershipVipBadgeSelectorsIDs.VIP_BADGE,
      }),
  };
});

describe('PerpsFeesDisplay', () => {
  it('shows a promotional seal and original fee without a VIP badge', () => {
    const { getByTestId, queryByTestId, queryByText } = render(
      <PerpsFeesDisplay
        fee={0}
        originalFee={10}
        feeDiscountPercentage={100}
        feeDiscountKind="promotional"
        testID="fee"
      />,
    );

    expect(
      getByTestId(PerpsFeeDiscountLabelSelectorsIDs.LABEL),
    ).toBeOnTheScreen();
    expect(queryByText('Promotional discount')).not.toBeOnTheScreen();
    expect(getByTestId('fee-original')).toBeOnTheScreen();
    expect(
      queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('uses a generic label when attribution is unknown', () => {
    const { getByText, queryByTestId } = render(
      <PerpsFeesDisplay fee={5} originalFee={10} feeDiscountPercentage={50} />,
    );

    expect(getByText('Fee discount')).toBeOnTheScreen();
    expect(
      queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
  });

  describe('Discount visibility', () => {
    it('does not show discounted fee when feeDiscountPercentage is undefined', () => {
      const { queryByTestId, getByTestId } = render(
        <PerpsFeesDisplay fee={10} testID="fee" />,
      );

      expect(getByTestId('fee')).toBeTruthy();
      expect(queryByTestId('fee-original')).toBeNull();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });

    it('does not show discounted fee when feeDiscountPercentage is zero', () => {
      const { queryByTestId } = render(
        <PerpsFeesDisplay
          fee={10}
          feeDiscountPercentage={0}
          originalFee={12}
          testID="fee"
        />,
      );

      expect(queryByTestId('fee-original')).toBeNull();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });

    it('does not show discounted fee when feeDiscountPercentage is negative', () => {
      const { queryByTestId } = render(
        <PerpsFeesDisplay
          fee={10}
          feeDiscountKind="vip"
          feeDiscountPercentage={-5}
          originalFee={12}
          testID="fee"
        />,
      );

      expect(queryByTestId('fee-original')).toBeNull();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });

    it('does not show strikethrough when originalFee is missing', () => {
      const { queryByTestId } = render(
        <PerpsFeesDisplay fee={10} feeDiscountPercentage={15} testID="fee" />,
      );

      expect(queryByTestId('fee-original')).toBeNull();
    });

    it('does not show strikethrough when originalFee equals fee', () => {
      const { queryByTestId } = render(
        <PerpsFeesDisplay
          fee={10}
          feeDiscountPercentage={15}
          originalFee={10}
          testID="fee"
        />,
      );

      expect(queryByTestId('fee-original')).toBeNull();
    });

    it('shows strikethrough original and discounted fee when discount and originalFee are provided', () => {
      const { getByTestId } = render(
        <PerpsFeesDisplay
          fee={8.5}
          feeDiscountKind="vip"
          feeDiscountPercentage={15}
          originalFee={10}
          testID="fee"
        />,
      );

      expect(getByTestId('fee-original')).toBeTruthy();
      expect(getByTestId('fee')).toBeTruthy();
    });
  });

  describe('Fee text rendering', () => {
    it('renders the formatted fee when fee is provided', () => {
      const { getByTestId } = render(
        <PerpsFeesDisplay fee={25.5} testID="fee" />,
      );

      expect(getByTestId('fee')).toBeTruthy();
    });

    it('renders placeholder when fee is undefined', () => {
      const { getByText } = render(<PerpsFeesDisplay fee={undefined} />);

      expect(getByText('--')).toBeTruthy();
    });

    it('renders custom placeholder when fee is undefined', () => {
      const { getByText } = render(
        <PerpsFeesDisplay fee={undefined} placeholder="-" />,
      );

      expect(getByText('-')).toBeTruthy();
    });
  });

  describe('VIP badge', () => {
    it('does not render the VIP badge by default', () => {
      const { queryByTestId } = render(<PerpsFeesDisplay fee={10} />);

      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });

    it('renders the VIP badge for a verified VIP discount', () => {
      const { getByTestId } = render(
        <PerpsFeesDisplay
          fee={10}
          feeDiscountKind="vip"
          feeDiscountPercentage={10}
          originalFee={12}
        />,
      );

      expect(getByTestId('rewards-vip-badge')).toBeTruthy();
    });

    it('renders VIP badge alongside strikethrough and fee text', () => {
      const { getByTestId } = render(
        <PerpsFeesDisplay
          fee={8.5}
          feeDiscountKind="vip"
          feeDiscountPercentage={15}
          originalFee={10}
          testID="fee"
        />,
      );

      expect(getByTestId('rewards-vip-badge')).toBeTruthy();
      expect(getByTestId('fee-original')).toBeTruthy();
      expect(getByTestId('fee')).toBeTruthy();
    });
  });

  describe('Fee discount presentation', () => {
    it('renders the member badge (not VIP) for a member discount', () => {
      const { getByTestId, queryByTestId } = render(
        <PerpsFeesDisplay
          fee={8.5}
          originalFee={10}
          feeDiscountPercentage={15}
          feeDiscountKind="member"
        />,
      );

      expect(getByTestId('rewards-member-badge')).toBeTruthy();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });

    it('does not show a badge or strikethrough for a subscription without a discount percentage', () => {
      const { queryByTestId } = render(
        <PerpsFeesDisplay
          fee={8.5}
          originalFee={10}
          feeDiscountKind="member"
          testID="fee"
        />,
      );

      expect(queryByTestId('rewards-member-badge')).toBeNull();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
      expect(queryByTestId('fee-original')).toBeNull();
    });

    it('renders the VIP badge for a VIP discount', () => {
      const { getByTestId, queryByTestId } = render(
        <PerpsFeesDisplay
          fee={8.5}
          originalFee={10}
          feeDiscountPercentage={15}
          feeDiscountKind="vip"
        />,
      );

      expect(getByTestId('rewards-vip-badge')).toBeTruthy();
      expect(queryByTestId('rewards-member-badge')).toBeNull();
    });

    it('renders generic discount copy without a badge', () => {
      const { getByText, queryByTestId } = render(
        <PerpsFeesDisplay
          fee={8.5}
          originalFee={10}
          feeDiscountPercentage={15}
          feeDiscountKind="generic"
        />,
      );

      expect(queryByTestId('rewards-member-badge')).toBeNull();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
      expect(getByText('Fee discount')).toBeTruthy();
    });

    it('falls back to generic discount copy when the kind is omitted', () => {
      const { getByText, queryByTestId } = render(
        <PerpsFeesDisplay
          fee={8.5}
          originalFee={10}
          feeDiscountPercentage={15}
        />,
      );

      expect(queryByTestId('rewards-vip-badge')).toBeNull();
      expect(queryByTestId('rewards-member-badge')).toBeNull();
      expect(getByText('Fee discount')).toBeTruthy();
    });
  });
});
