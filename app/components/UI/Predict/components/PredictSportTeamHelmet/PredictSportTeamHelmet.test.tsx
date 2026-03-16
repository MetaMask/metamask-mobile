import React from 'react';
import { render } from '@testing-library/react-native';
import Svg, { G } from 'react-native-svg';
import PredictSportTeamHelmet from './PredictSportTeamHelmet';

describe('PredictSportTeamHelmet', () => {
  describe('rendering', () => {
    it('renders helmet with required color prop', () => {
      const teamColor = '#002244';

      const { getByTestId } = render(
        <PredictSportTeamHelmet color={teamColor} testID="helmet" />,
      );

      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet with team-specific color', () => {
      const customTeamColor = '#1D4E9B';

      const { getByTestId } = render(
        <PredictSportTeamHelmet color={customTeamColor} testID="helmet" />,
      );

      expect(getByTestId('helmet')).toBeOnTheScreen();
    });
  });

  describe('size prop', () => {
    it('uses 48px as default size when size prop is omitted', () => {
      const defaultSize = 48;

      const { getByTestId } = render(
        <PredictSportTeamHelmet color="#002244" testID="helmet" />,
      );

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
      const { getByTestId } = render(
        <PredictSportTeamHelmet color="#002244" size={size} testID="helmet" />,
      );

      const svg = getByTestId('helmet');
      expect(svg.props.width).toBe(size);
      expect(svg.props.height).toBe(size);
    });
  });

  describe('flipped prop', () => {
    it('renders helmet facing right when flipped is false', () => {
      const flipped = false;

      const { getByTestId } = render(
        <PredictSportTeamHelmet
          color="#002244"
          flipped={flipped}
          testID="helmet"
        />,
      );

      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet facing left when flipped is true for away team', () => {
      const flipped = true;

      const { getByTestId } = render(
        <PredictSportTeamHelmet
          color="#FB4F14"
          flipped={flipped}
          testID="helmet"
        />,
      );

      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet facing right when flipped prop is omitted', () => {
      const { getByTestId } = render(
        <PredictSportTeamHelmet color="#002244" testID="helmet" />,
      );

      expect(getByTestId('helmet')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('renders helmet with hex color including alpha channel', () => {
      const colorWithAlpha = '#002244FF';

      const { getByTestId } = render(
        <PredictSportTeamHelmet color={colorWithAlpha} testID="helmet" />,
      );

      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet with short hex color format', () => {
      const shortHexColor = '#FFF';

      const { getByTestId } = render(
        <PredictSportTeamHelmet color={shortHexColor} testID="helmet" />,
      );

      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet with RGB color format', () => {
      const rgbColor = 'rgb(0, 34, 68)';

      const { getByTestId } = render(
        <PredictSportTeamHelmet color={rgbColor} testID="helmet" />,
      );

      expect(getByTestId('helmet')).toBeOnTheScreen();
    });

    it('renders helmet with very small size', () => {
      const minimalSize = 16;

      const { getByTestId } = render(
        <PredictSportTeamHelmet
          color="#002244"
          size={minimalSize}
          testID="helmet"
        />,
      );

      const svg = getByTestId('helmet');
      expect(svg.props.width).toBe(minimalSize);
      expect(svg.props.height).toBe(minimalSize);
    });

    it('renders helmet with very large size', () => {
      const largeSize = 128;

      const { getByTestId } = render(
        <PredictSportTeamHelmet
          color="#002244"
          size={largeSize}
          testID="helmet"
        />,
      );

      const svg = getByTestId('helmet');
      expect(svg.props.width).toBe(largeSize);
      expect(svg.props.height).toBe(largeSize);
    });
  });

  describe('viewBox and transform', () => {
    it('maintains 40x40 viewBox regardless of size prop', () => {
      const customSize = 96;

      const { UNSAFE_getByType } = render(
        <PredictSportTeamHelmet
          color="#002244"
          size={customSize}
          testID="helmet"
        />,
      );

      const svg = UNSAFE_getByType(Svg);
      expect(svg.props.viewBox).toBe('0 0 40 40');
    });

    it('applies scale transform when flipped is true', () => {
      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamHelmet color="#002244" flipped testID="helmet" />,
      );

      const gElements = UNSAFE_getAllByType(G);
      const mainGElement = gElements.find(
        (el) => el.props.transform !== undefined,
      );

      expect(mainGElement).toBeDefined();
      expect(mainGElement?.props.transform).toBe(
        'scale(-1, 1) translate(-40, 0)',
      );
    });

    it('omits transform when flipped is false', () => {
      const { UNSAFE_getAllByType } = render(
        <PredictSportTeamHelmet
          color="#002244"
          flipped={false}
          testID="helmet"
        />,
      );

      const gElements = UNSAFE_getAllByType(G);
      const hasNoTransforms = gElements.every(
        (el) => el.props.transform === undefined,
      );

      expect(hasNoTransforms).toBe(true);
    });
  });
});
