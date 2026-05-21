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

  it('handles undefined data prop', () => {
    // Arrange & Act
    const { getByText } = render(<FeesTooltipContent testID="fees-tooltip" />);

    // Assert
    expect(getByText('MetaMask fee')).toBeTruthy();
    expect(getByText('Provider fee')).toBeTruthy();
  });
});
