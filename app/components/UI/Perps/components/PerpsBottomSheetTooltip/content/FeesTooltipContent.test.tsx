import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Image } from 'react-native';
import FeesTooltipContent from './FeesTooltipContent';

jest.mock('../../../../shared/MembershipVipBadge/MembershipVipBadge', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ hasProEntitlement }: { hasProEntitlement?: boolean }) =>
      MockReact.createElement(View, {
        testID: hasProEntitlement
          ? 'rewards-member-badge'
          : 'rewards-vip-badge',
      }),
  };
});

describe('FeesTooltipContent', () => {
  const mockData = {
    metamaskFeeRate: 0.01,
    protocolFeeRate: 0.00045,
    originalMetamaskFeeRate: 0.015,
    feeDiscountPercentage: 25,
  };

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
      feeSource: 'subscription' as const,
    };

    it('shows the Orange chip and info button instead of the old Member badge', () => {
      const onOpenNestedInfo = jest.fn();
      const { getByTestId, queryByTestId } = render(
        <FeesTooltipContent
          testID="fees-tooltip"
          data={{ ...memberData, feeDiscountPercentage: 100 }}
          onOpenNestedInfo={onOpenNestedInfo}
        />,
      );

      expect(getByTestId('fees-tooltip-orange-chip')).toHaveTextContent(
        'Orange',
      );
      expect(queryByTestId('rewards-member-badge')).toBeNull();
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
      const info = getByTestId('fees-tooltip-orange-info');
      expect(info.props.accessibilityLabel).toBe('About Orange fees');
      fireEvent.press(info);
      expect(onOpenNestedInfo).toHaveBeenCalledWith('orange_fees');
    });

    it('keeps the full member percentages: struck-through rate then 0%', () => {
      const { getByText } = render(
        <FeesTooltipContent
          testID="fees-tooltip"
          data={{
            ...memberData,
            metamaskFeeRate: 0,
            feeDiscountPercentage: 100,
          }}
        />,
      );

      expect(getByText('1.000%')).toBeTruthy();
      expect(getByText('0.000%')).toBeTruthy();
      expect(getByText('0.045%')).toBeTruthy();
      expect(
        getByText("You're saving 100% on the MetaMask fee for this trade."),
      ).toBeTruthy();
    });

    it('shows the blended MetaMask rate for a partial member waiver', () => {
      // $2,413 order with $1,000 covered: 0.1% x (1 - 1000 / 2413).
      const { getByText } = render(
        <FeesTooltipContent
          testID="fees-tooltip"
          data={{
            ...memberData,
            metamaskFeeRate: 0.0005856,
            originalMetamaskFeeRate: 0.001,
            feeDiscountPercentage: 41.44,
          }}
        />,
      );

      expect(getByText('0.100%')).toBeTruthy();
      expect(getByText('0.059%')).toBeTruthy();
      expect(
        getByText("You're saving 41.44% on the MetaMask fee for this trade."),
      ).toBeTruthy();
    });

    it('hides the info button when the host cannot open nested info', () => {
      const { getByTestId, queryByTestId } = render(
        <FeesTooltipContent
          testID="fees-tooltip"
          data={{ ...memberData, feeDiscountPercentage: 100 }}
        />,
      );

      expect(getByTestId('fees-tooltip-orange-chip')).toBeTruthy();
      expect(queryByTestId('fees-tooltip-orange-info')).toBeNull();
    });

    it('shows the member banner on the neutral muted surface, text only', () => {
      const { getByTestId, getByText, UNSAFE_queryAllByType } = render(
        <FeesTooltipContent
          testID="fees-tooltip"
          data={{ ...memberData, feeDiscountPercentage: 25 }}
        />,
      );

      expect(getByTestId('fees-tooltip-orange-banner')).toBeTruthy();
      expect(
        getByText("You're saving 25% on the MetaMask fee for this trade."),
      ).toBeTruthy();
      expect(UNSAFE_queryAllByType(Image)).toHaveLength(0);
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
      expect(
        getByText("You're saving 25% on the MetaMask fee for this trade."),
      ).toBeTruthy();
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
      expect(queryByTestId('fees-tooltip-orange-chip')).toBeNull();
      expect(queryByText('1.000%')).toBeNull();
      expect(getByText('0.500%')).toBeTruthy();
      expect(queryByText(/saving/i)).toBeNull();
    });

    it('renders the VIP badge when the fee source is rewards', () => {
      // Arrange & Act
      const { getByTestId, queryByTestId } = render(
        <FeesTooltipContent
          testID="fees-tooltip"
          data={{ ...mockData, feeSource: 'rewards' }}
        />,
      );

      // Assert
      expect(getByTestId('rewards-vip-badge')).toBeTruthy();
      expect(queryByTestId('rewards-member-badge')).toBeNull();
      expect(queryByTestId('fees-tooltip-orange-chip')).toBeNull();
      expect(queryByTestId('fees-tooltip-orange-banner')).toBeNull();
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
