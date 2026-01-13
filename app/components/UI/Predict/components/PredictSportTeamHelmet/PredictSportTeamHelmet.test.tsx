import React from 'react';
import { render } from '@testing-library/react-native';
import { G } from 'react-native-svg';
import PredictSportTeamHelmet from './PredictSportTeamHelmet';

describe('PredictSportTeamHelmet', () => {
  describe('rendering', () => {
    it('renders helmet with required color prop', () => {
      // Arrange
      const teamColor = '#002244';

      // Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet color={teamColor} testID="helmet" />,
      );

      // Assert
      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet with team-specific color', () => {
      // Arrange
      const customTeamColor = '#1D4E9B';

      // Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet color={customTeamColor} testID="helmet" />,
      );

      // Assert
      expect(getByTestId('helmet')).toBeOnTheScreen();
    });
  });

  describe('size prop', () => {
    it('uses 48px as default size when size prop is omitted', () => {
      // Arrange
      const defaultSize = 48;

      // Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet color="#002244" testID="helmet" />,
      );

      // Assert
      const svg = getByTestId('helmet');
      expect(svg.props.width).toBe(defaultSize);
      expect(svg.props.height).toBe(defaultSize);
    });

    it.each([
      [32, '32px'],
      [48, '48px'],
      [64, '64px'],
      [80, '80px'],
    ])('renders helmet at %s size', (size) => {
      // Arrange & Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet color="#002244" size={size} testID="helmet" />,
      );

      // Assert
      const svg = getByTestId('helmet');
      expect(svg.props.width).toBe(size);
      expect(svg.props.height).toBe(size);
    });
  });

  describe('flipped prop', () => {
    it('renders helmet facing right when flipped is false', () => {
      // Arrange
      const flipped = false;

      // Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet
          color="#002244"
          flipped={flipped}
          testID="helmet"
        />,
      );

      // Assert
      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet facing left when flipped is true for away team', () => {
      // Arrange
      const flipped = true;

      // Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet
          color="#FB4F14"
          flipped={flipped}
          testID="helmet"
        />,
      );

      // Assert
      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet facing right when flipped prop is omitted', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet color="#002244" testID="helmet" />,
      );

      // Assert
      expect(getByTestId('helmet')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('renders helmet with hex color including alpha channel', () => {
      // Arrange
      const colorWithAlpha = '#002244FF';

      // Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet color={colorWithAlpha} testID="helmet" />,
      );

      // Assert
      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet with short hex color format', () => {
      // Arrange
      const shortHexColor = '#FFF';

      // Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet color={shortHexColor} testID="helmet" />,
      );

      // Assert
      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet with RGB color format', () => {
      // Arrange
      const rgbColor = 'rgb(0, 34, 68)';

      // Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet color={rgbColor} testID="helmet" />,
      );

      // Assert
      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet with very small size', () => {
      // Arrange
      const minimalSize = 16;

      // Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet
          color="#002244"
          size={minimalSize}
          testID="helmet"
        />,
      );

      // Assert
      const svg = getByTestId('helmet');
      expect(svg.props.width).toBe(minimalSize);
      expect(svg.props.height).toBe(minimalSize);
    });

    it('renders helmet with very large size', () => {
      // Arrange
      const largeSize = 128;

      // Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet
          color="#002244"
          size={largeSize}
          testID="helmet"
        />,
      );

      // Assert
      const svg = getByTestId('helmet');
      expect(svg.props.width).toBe(largeSize);
      expect(svg.props.height).toBe(largeSize);
    });
  });

  describe('viewBox and transform', () => {
    it('maintains 40x40 viewBox regardless of size prop', () => {
      // Arrange
      const customSize = 96;

      // Act
      const { getByTestId } = render(
        <PredictSportTeamHelmet
          color="#002244"
          size={customSize}
          testID="helmet"
        />,
      );

      // Assert
      const svg = getByTestId('helmet');
      expect(svg.props.viewBox).toBe('0 0 40 40');
    });

    it('applies scale transform when flipped is true', () => {
      // Arrange & Act
      const { UNSAFE_getByType } = render(
        <PredictSportTeamHelmet color="#002244" flipped testID="helmet" />,
      );

      // Assert
      // G component contains the transform
      const gElement = UNSAFE_getByType(G);
      expect(gElement.props.transform).toBe('scale(-1, 1) translate(-40, 0)');
    });

    it('omits transform when flipped is false', () => {
      // Arrange & Act
      const { UNSAFE_getByType } = render(
        <PredictSportTeamHelmet
          color="#002244"
          flipped={false}
          testID="helmet"
        />,
      );

      // Assert
      const gElement = UNSAFE_getByType(G);
      expect(gElement.props.transform).toBeUndefined();
    });
  });
});
