import React from 'react';
import { render } from '@testing-library/react-native';
import SeasonTierImage from './index';

// Mock the image require calls
jest.mock(
  '../../../../../images/rewards/tiers/rewards-s1-tier-1.png',
  () => 'tier-1-image',
);

describe('SeasonTierImage', () => {
  it('renders with valid tier order', () => {
    // Arrange
    const tierOrder = 1;

    // Act
    const { getByTestId } = render(
      <SeasonTierImage tierOrder={tierOrder} testID="season-tier-image" />,
    );

    // Assert
    expect(getByTestId('season-tier-image')).toBeOnTheScreen();
  });

  it('displays tier 1 image when tier order is 1', () => {
    // Arrange
    const tierOrder = 1;

    // Act
    const { getByTestId } = render(
      <SeasonTierImage tierOrder={tierOrder} testID="season-tier-image" />,
    );

    // Assert
    const image = getByTestId('season-tier-image');
    expect(image).toBeOnTheScreen();
    expect(image.props.source).toBe('tier-1-image');
  });

  it('falls back to tier 1 image when invalid tier order is provided', () => {
    // Arrange
    const invalidTierOrder = 999;

    // Act
    const { getByTestId } = render(
      <SeasonTierImage
        tierOrder={invalidTierOrder}
        testID="season-tier-image"
      />,
    );

    // Assert
    const image = getByTestId('season-tier-image');
    expect(image).toBeOnTheScreen();
    expect(image.props.source).toBe('tier-1-image');
  });

  it('applies custom style when provided', () => {
    // Arrange
    const tierOrder = 1;
    const customStyle = { width: 100, height: 100 };

    // Act
    const { getByTestId } = render(
      <SeasonTierImage
        tierOrder={tierOrder}
        style={customStyle}
        testID="season-tier-image"
      />,
    );

    // Assert
    const image = getByTestId('season-tier-image');
    expect(image).toBeOnTheScreen();
    expect(image.props.style).toContainEqual(customStyle);
  });

  it('sets resizeMode to contain', () => {
    // Arrange
    const tierOrder = 1;

    // Act
    const { getByTestId } = render(
      <SeasonTierImage tierOrder={tierOrder} testID="season-tier-image" />,
    );

    // Assert
    const image = getByTestId('season-tier-image');
    expect(image.props.resizeMode).toBe('contain');
  });

  it('handles zero tier order by falling back to tier 1', () => {
    // Arrange
    const tierOrder = 0;

    // Act
    const { getByTestId } = render(
      <SeasonTierImage tierOrder={tierOrder} testID="season-tier-image" />,
    );

    // Assert
    const image = getByTestId('season-tier-image');
    expect(image).toBeOnTheScreen();
    expect(image.props.source).toBe('tier-1-image');
  });

  it('handles negative tier order by falling back to tier 1', () => {
    // Arrange
    const tierOrder = -1;

    // Act
    const { getByTestId } = render(
      <SeasonTierImage tierOrder={tierOrder} testID="season-tier-image" />,
    );

    // Assert
    const image = getByTestId('season-tier-image');
    expect(image).toBeOnTheScreen();
    expect(image.props.source).toBe('tier-1-image');
  });
});
