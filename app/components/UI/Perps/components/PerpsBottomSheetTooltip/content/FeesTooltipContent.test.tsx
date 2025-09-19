import React from 'react';
import { render } from '@testing-library/react-native';
import FeesTooltipContent from './FeesTooltipContent';

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
    expect(getByText("You're saving 25% with MetaMask Rewards.")).toBeTruthy();
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

  it('handles undefined data prop', () => {
    // Arrange & Act
    const { getByText } = render(<FeesTooltipContent testID="fees-tooltip" />);

    // Assert
    expect(getByText('MetaMask fee')).toBeTruthy();
    expect(getByText('Provider fee')).toBeTruthy();
  });
});
