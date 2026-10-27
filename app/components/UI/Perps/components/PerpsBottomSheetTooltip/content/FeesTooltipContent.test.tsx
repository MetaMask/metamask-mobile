import React from 'react';
import { render } from '@testing-library/react-native';
import { MembershipVipBadgeSelectorsIDs } from '../../../../shared/MembershipVipBadge/MembershipVipBadge';
import { PerpsFeeDiscountLabelSelectorsIDs } from '../../../Perps.testIds';
import FeesTooltipContent from './FeesTooltipContent';

jest.mock('../../../../shared/MembershipVipBadge/MembershipVipBadge', () => {
  const actual = jest.requireActual<
    typeof import('../../../../shared/MembershipVipBadge/MembershipVipBadge')
  >('../../../../shared/MembershipVipBadge/MembershipVipBadge');
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

describe('FeesTooltipContent', () => {
  const mockData = {
    metamaskFeeRate: 0.01,
    protocolFeeRate: 0.00045,
    originalMetamaskFeeRate: 0.015,
    feeDiscountPercentage: 25,
    feeDiscountKind: 'vip' as const,
  };

  it('explains the promotional discount without VIP branding', () => {
    const { getByText, getByTestId, queryByTestId, queryByText } = render(
      <FeesTooltipContent
        testID="fees-tooltip"
        data={{ ...mockData, feeDiscountKind: 'promotional' }}
      />,
    );

    expect(getByText('25% off the MetaMask fee.')).toBeOnTheScreen();
    expect(
      getByTestId(PerpsFeeDiscountLabelSelectorsIDs.LABEL),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
    expect(queryByTestId('vip-discount-icon')).not.toBeOnTheScreen();
    expect(queryByText(/as a VIP/)).not.toBeOnTheScreen();
  });

  it('does not claim VIP eligibility when attribution is unknown', () => {
    const { getByText, queryByTestId } = render(
      <FeesTooltipContent
        testID="fees-tooltip"
        data={{ ...mockData, feeDiscountKind: undefined }}
      />,
    );

    expect(
      getByText("You're saving 25% on the MetaMask fee."),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MembershipVipBadgeSelectorsIDs.VIP_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('displays fee information correctly', () => {
    // Arrange & Act
    const { getByText } = render(
      <FeesTooltipContent testID="fees-tooltip" data={mockData} />,
    );

    // Assert
    expect(getByText('MetaMask fee')).toBeTruthy();
    expect(getByText('Provider fee')).toBeTruthy();
  });

  it('displays discount banner when discount percentage is provided', () => {
    // Arrange & Act
    const { getByText } = render(
      <FeesTooltipContent testID="fees-tooltip" data={mockData} />,
    );

    // Assert
    expect(getByText("You're saving 25% on fees as a VIP.")).toBeTruthy();
  });

  it('does not display discount banner when no discount', () => {
    // Arrange
    const dataWithoutDiscount = {
      metamaskFeeRate: 0.01,
      protocolFeeRate: 0.00045,
    };

    // Act
    const { queryByText } = render(
      <FeesTooltipContent testID="fees-tooltip" data={dataWithoutDiscount} />,
    );

    // Assert
    expect(queryByText(/saving/i)).toBeFalsy();
  });

  it('handles missing discount data gracefully', () => {
    // Arrange & Act
    const { queryByText } = render(
      <FeesTooltipContent testID="fees-tooltip" data={{}} />,
    );

    // Assert
    expect(queryByText(/saving/i)).toBeFalsy();
  });

  it('displays strikethrough original fee when discount applies', () => {
    // Arrange & Act
    const { getByText } = render(
      <FeesTooltipContent testID="fees-tooltip" data={mockData} />,
    );

    // Assert
    expect(getByText('1.500%')).toBeTruthy(); // Original fee with strikethrough
    expect(getByText('1.000%')).toBeTruthy(); // Discounted fee
  });

  it('renders VIP badge in MetaMask fee row when discount is active', () => {
    // Arrange & Act
    const { getByTestId } = render(
      <FeesTooltipContent testID="fees-tooltip" data={mockData} />,
    );

    // Assert
    expect(getByTestId('rewards-vip-badge')).toBeTruthy();
  });

  it('does not render VIP badge when no discount', () => {
    // Arrange
    const dataWithoutDiscount = {
      metamaskFeeRate: 0.01,
      protocolFeeRate: 0.00045,
    };

    // Act
    const { queryByTestId } = render(
      <FeesTooltipContent testID="fees-tooltip" data={dataWithoutDiscount} />,
    );

    // Assert
    expect(queryByTestId('rewards-vip-badge')).toBeFalsy();
  });

  it('renders the full fee without a discount when the discount is 0', () => {
    // Arrange
    const dataWithZeroDiscount = {
      metamaskFeeRate: 0.001,
      protocolFeeRate: 0.00045,
      originalMetamaskFeeRate: 0.001,
      feeDiscountPercentage: 0,
    };

    // Act
    const { getByTestId, getByText, queryByText, queryByTestId } = render(
      <FeesTooltipContent testID="fees-tooltip" data={dataWithZeroDiscount} />,
    );

    // Assert
    // A bare "0" child of a View throws on device: text must be inside <Text>
    expect(getByTestId('fees-tooltip').children).not.toContain('0');
    expect(getByText('0.100%')).toBeOnTheScreen();
    expect(queryByText(/saving/i)).toBeNull();
    expect(queryByTestId('rewards-vip-badge')).toBeNull();
  });

  describe('member fee source', () => {
    const memberData = {
      metamaskFeeRate: 0.005,
      protocolFeeRate: 0.00045,
      originalMetamaskFeeRate: 0.01,
      feeDiscountKind: 'member' as const,
    };

    it('renders the member badge instead of the VIP badge', () => {
      // Arrange & Act
      const { getByTestId, queryByTestId } = render(
        <FeesTooltipContent
          testID="fees-tooltip"
          data={{ ...memberData, feeDiscountPercentage: 25 }}
        />,
      );

      // Assert
      expect(getByTestId('rewards-member-badge')).toBeTruthy();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });

    it('shows the member saving message instead of the VIP one', () => {
      // Arrange & Act
      const { getByText, queryByText } = render(
        <FeesTooltipContent
          testID="fees-tooltip"
          data={{ ...memberData, feeDiscountPercentage: 25 }}
        />,
      );

      // Assert
      expect(getByText("You're saving 25% on fees as a member.")).toBeTruthy();
      expect(queryByText(/as a VIP/)).toBeNull();
    });

    it('shows no badge, strikethrough or saving message without a discount percentage', () => {
      // Arrange & Act
      const { getByText, queryByTestId, queryByText } = render(
        <FeesTooltipContent testID="fees-tooltip" data={memberData} />,
      );

      // Assert
      expect(queryByTestId('rewards-member-badge')).toBeNull();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
      expect(queryByText('1.000%')).toBeNull();
      expect(getByText('0.500%')).toBeTruthy();
      expect(queryByText(/saving/i)).toBeNull();
    });

    it('renders the VIP badge for VIP presentation', () => {
      // Arrange & Act
      const { getByTestId, queryByTestId } = render(
        <FeesTooltipContent testID="fees-tooltip" data={mockData} />,
      );

      // Assert
      expect(getByTestId('rewards-vip-badge')).toBeTruthy();
      expect(queryByTestId('rewards-member-badge')).toBeNull();
    });
  });

  it('handles undefined data prop', () => {
    // Arrange & Act
    const { getByText } = render(<FeesTooltipContent testID="fees-tooltip" />);

    // Assert
    expect(getByText('MetaMask fee')).toBeTruthy();
    expect(getByText('Provider fee')).toBeTruthy();
  });
});
