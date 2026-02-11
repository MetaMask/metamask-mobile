import React from 'react';
import { render } from '@testing-library/react-native';
import Svg from 'react-native-svg';
import PredictSportWinner from './PredictSportWinner';

describe('PredictSportWinner', () => {
  describe('rendering', () => {
    it('renders trophy with required color prop', () => {
      const trophyColor = '#FFD700';

      const { getByTestId } = render(
        <PredictSportWinner color={trophyColor} testID="trophy" />,
      );

      expect(getByTestId('trophy')).toBeOnTheScreen();
    });

    it('renders trophy with team-specific color', () => {
      const customTeamColor = '#1D4E9B';

      const { getByTestId } = render(
        <PredictSportWinner color={customTeamColor} testID="trophy" />,
      );

      expect(getByTestId('trophy')).toBeOnTheScreen();
    });
  });

  describe('size prop', () => {
    it('uses 16px as default size when size prop is omitted', () => {
      const defaultSize = 16;

      const { getByTestId } = render(
        <PredictSportWinner color="#FFD700" testID="trophy" />,
      );

      const svg = getByTestId('trophy');
      expect(svg.props.width).toBe(defaultSize);
      expect(svg.props.height).toBe(defaultSize);
    });

    it.each([
      [12, '12px'],
      [16, '16px'],
      [20, '20px'],
      [24, '24px'],
    ])('renders trophy at %s size', (size) => {
      const { getByTestId } = render(
        <PredictSportWinner color="#FFD700" size={size} testID="trophy" />,
      );

      const svg = getByTestId('trophy');
      expect(svg.props.width).toBe(size);
      expect(svg.props.height).toBe(size);
    });
  });

  describe('edge cases', () => {
    it('renders trophy with hex color including alpha channel', () => {
      const colorWithAlpha = '#FFD700FF';

      const { getByTestId } = render(
        <PredictSportWinner color={colorWithAlpha} testID="trophy" />,
      );

      expect(getByTestId('trophy')).toBeOnTheScreen();
    });

    it('renders trophy with short hex color format', () => {
      const shortHexColor = '#FFF';

      const { getByTestId } = render(
        <PredictSportWinner color={shortHexColor} testID="trophy" />,
      );

      expect(getByTestId('trophy')).toBeOnTheScreen();
    });

    it('renders trophy with RGB color format', () => {
      const rgbColor = 'rgb(255, 215, 0)';

      const { getByTestId } = render(
        <PredictSportWinner color={rgbColor} testID="trophy" />,
      );

      expect(getByTestId('trophy')).toBeOnTheScreen();
    });

    it('renders trophy with very small size', () => {
      const minimalSize = 8;

      const { getByTestId } = render(
        <PredictSportWinner
          color="#FFD700"
          size={minimalSize}
          testID="trophy"
        />,
      );

      const svg = getByTestId('trophy');
      expect(svg.props.width).toBe(minimalSize);
      expect(svg.props.height).toBe(minimalSize);
    });

    it('renders trophy with very large size', () => {
      const largeSize = 64;

      const { getByTestId } = render(
        <PredictSportWinner color="#FFD700" size={largeSize} testID="trophy" />,
      );

      const svg = getByTestId('trophy');
      expect(svg.props.width).toBe(largeSize);
      expect(svg.props.height).toBe(largeSize);
    });
  });

  describe('viewBox', () => {
    it('maintains 16x16 viewBox regardless of size prop', () => {
      const customSize = 48;

      const { UNSAFE_getByType } = render(
        <PredictSportWinner
          color="#FFD700"
          size={customSize}
          testID="trophy"
        />,
      );

      const svg = UNSAFE_getByType(Svg);
      expect(svg.props.viewBox).toBe('0 0 16 16');
    });
  });
});
