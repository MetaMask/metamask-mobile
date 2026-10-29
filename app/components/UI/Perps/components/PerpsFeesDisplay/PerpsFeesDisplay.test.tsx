import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, TextColor } from '@metamask/design-system-react-native';
import Svg from 'react-native-svg';
import { strings } from '../../../../../../locales/i18n';
import { MembershipVipBadgeSelectorsIDs } from '../../../shared/MembershipVipBadge/MembershipVipBadge';
import { PerpsFeeDiscountLabelSelectorsIDs } from '../../Perps.testIds';
import PerpsFeesDisplay from './PerpsFeesDisplay';
import { SEAL_PERCENT_ICON_SIZE } from './SealPercentIcon';

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
    expect(
      getByTestId(PerpsFeeDiscountLabelSelectorsIDs.LABEL).props
        .accessibilityLabel,
    ).toBe(strings('perps.tooltips.fees.promotional_discount'));
    expect(queryByText('Promotional discount')).not.toBeOnTheScreen();
    expect(getByTestId('fee-original').props.accessibilityLabel).toBe(
      strings('perps.tooltips.fees.original_fee_value', {
        fee: getByTestId('fee-original').props.children,
      }),
    );
    expect(
      queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('uses success color for a promotional fee beside its original fee', () => {
    const { UNSAFE_getAllByType } = render(
      <PerpsFeesDisplay
        fee={8.5}
        originalFee={10}
        feeDiscountPercentage={15}
        feeDiscountKind="promotional"
        testID="fee"
      />,
    );

    const discountedFee = UNSAFE_getAllByType(Text).find(
      (node) => node.props.testID === 'fee',
    );

    expect(discountedFee?.props.color).toBe(TextColor.SuccessDefault);
  });

  it('uses the fee-row-sized promotional seal', () => {
    const { UNSAFE_getByType } = render(
      <PerpsFeesDisplay
        fee={8.5}
        originalFee={10}
        feeDiscountPercentage={15}
        feeDiscountKind="promotional"
      />,
    );

    expect(UNSAFE_getByType(Svg).props).toMatchObject({
      width: SEAL_PERCENT_ICON_SIZE.feeRow,
      height: SEAL_PERCENT_ICON_SIZE.feeRow,
    });
  });

  it('keeps the placeholder in the configured row color', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <PerpsFeesDisplay
        fee={undefined}
        feeDiscountPercentage={15}
        feeDiscountKind="promotional"
        color={TextColor.TextDefault}
        testID="fee"
      />,
    );

    const placeholder = UNSAFE_getAllByType(Text).find(
      (node) => node.props.testID === 'fee',
    );

    expect(getByTestId('fee')).toHaveTextContent('--');
    expect(placeholder?.props.color).toBe(TextColor.TextDefault);
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

  describe('Percentage mode (Perps Fee Display Format A/B test, TAT-4046)', () => {
    it('renders "Taker X% / Maker Y%" from the rates and ignores fee/originalFee', () => {
      const { getByText, queryByText } = render(
        <PerpsFeesDisplay
          feeDisplayMode="percentage"
          takerFeeRate={0.00143}
          makerFeeRate={0.00114}
          fee={8.5}
          originalFee={10}
          testID="fee"
        />,
      );

      expect(getByText('Taker 0.143% /')).toBeTruthy();
      expect(getByText('Maker 0.114%')).toBeTruthy();
      // The dollar-mode formatted fee text must not leak through.
      expect(queryByText('$8.50')).toBeNull();
    });

    it('keeps the base testID mounted so dollar-mode readiness waits (e.g. E2E waitForFeesReady) still resolve', () => {
      const { getByTestId } = render(
        <PerpsFeesDisplay
          fee={undefined}
          feeDisplayMode="percentage"
          takerFeeRate={0.00143}
          makerFeeRate={0.00114}
          testID="fee"
        />,
      );

      // Rendered on the row container, alongside the per-rate -taker/-maker
      // testIDs, since the single value-bearing <Text testID="fee"> from
      // dollar mode does not render in this branch.
      expect(getByTestId('fee')).toBeTruthy();
      expect(getByTestId('fee-taker')).toHaveTextContent('Taker 0.143% /');
      expect(getByTestId('fee-maker')).toHaveTextContent('Maker 0.114%');
    });

    it('renders the placeholder when either rate is undefined', () => {
      const { getByText } = render(
        <PerpsFeesDisplay
          fee={undefined}
          feeDisplayMode="percentage"
          takerFeeRate={0.00143}
          makerFeeRate={undefined}
        />,
      );

      expect(getByText('--')).toBeTruthy();
    });

    it('renders a custom placeholder when both rates are undefined', () => {
      const { getByText } = render(
        <PerpsFeesDisplay
          fee={undefined}
          feeDisplayMode="percentage"
          placeholder="-"
        />,
      );

      expect(getByText('-')).toBeTruthy();
    });

    it('suppresses the strikethrough original fee even when a discount is present', () => {
      const { queryByTestId, getByTestId, getByText } = render(
        <PerpsFeesDisplay
          feeDisplayMode="percentage"
          takerFeeRate={0.00143}
          makerFeeRate={0.00114}
          fee={8.5}
          originalFee={10}
          feeDiscountPercentage={15}
          feeDiscountKind="vip"
          testID="fee"
        />,
      );

      expect(queryByTestId('fee-original')).toBeNull();
      // The VIP attribution label is independent of display mode and still renders.
      expect(getByTestId('rewards-vip-badge')).toBeTruthy();
      expect(getByText('Taker 0.143% /')).toBeTruthy();
      expect(getByText('Maker 0.114%')).toBeTruthy();
    });

    it('defaults to dollar mode when feeDisplayMode is omitted', () => {
      const { getByText } = render(<PerpsFeesDisplay fee={25.5} />);

      expect(getByText('$25.50')).toBeTruthy();
    });
  });
});
