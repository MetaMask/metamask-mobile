import React from 'react';
import { render } from '@testing-library/react-native';
import FeesTooltipContent from './FeesTooltipContent';

jest.mock(
  '../../../../Rewards/components/RewardsVipBadge/RewardsVipBadge',
  () => {
    const MockReact = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () =>
        MockReact.createElement(View, { testID: 'rewards-vip-badge' }),
    };
  },
);

describe('FeesTooltipContent', () => {
  const mockData = {
    metamaskFeeRate: 0.01,
    protocolFeeRate: 0.00045,
    originalMetamaskFeeRate: 0.015,
    feeDiscountPercentage: 25,
    feeDiscountKind: 'vip' as const,
  };

  it('explains the promotional discount without VIP branding', () => {
    const { getByText, queryByTestId, queryByText } = render(
      <FeesTooltipContent
        testID="fees-tooltip"
        data={{ ...mockData, feeDiscountKind: 'promotional' }}
      />,
    );

    expect(
      getByText('Promotional discount: 25% off the MetaMask fee.'),
    ).toBeTruthy();
    expect(queryByTestId('rewards-vip-badge')).toBeNull();
    expect(queryByTestId('vip-discount-icon')).toBeNull();
    expect(queryByText(/as a VIP/)).toBeNull();
  });

  it('does not claim VIP eligibility when attribution is unknown', () => {
    const { getByText, queryByTestId } = render(
      <FeesTooltipContent
        testID="fees-tooltip"
        data={{ ...mockData, feeDiscountKind: undefined }}
      />,
    );

    expect(getByText("You're saving 25% on the MetaMask fee.")).toBeTruthy();
    expect(queryByTestId('rewards-vip-badge')).toBeNull();
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

  it('handles undefined data prop', () => {
    // Arrange & Act
    const { getByText } = render(<FeesTooltipContent testID="fees-tooltip" />);

    // Assert
    expect(getByText('MetaMask fee')).toBeTruthy();
    expect(getByText('Provider fee')).toBeTruthy();
  });
});
