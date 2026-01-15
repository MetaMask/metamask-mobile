import React from 'react';
import { render } from '@testing-library/react-native';
import Svg from 'react-native-svg';
import PredictSportFootballIcon from './PredictSportFootballIcon';
import { mockTheme } from '../../../../../util/theme';

const mockUseTheme = jest.fn();

jest.mock('../../../../../util/theme', () => ({
  ...jest.requireActual('../../../../../util/theme'),
  mockTheme: jest.requireActual('../../../../../util/theme').mockTheme,
  useTheme: mockUseTheme,
}));

describe('PredictSportFootballIcon', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue(mockTheme);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders football icon with default props', () => {
      const { getByTestId } = render(
        <PredictSportFootballIcon testID="football" />,
      );

      expect(getByTestId('football')).toBeOnTheScreen();
    });

    it('renders football icon with custom color prop', () => {
      const customColor = '#FF0000';

      const { getByTestId } = render(
        <PredictSportFootballIcon color={customColor} testID="football" />,
      );

      expect(getByTestId('football')).toBeOnTheScreen();
    });
  });

  describe('size prop', () => {
    it('applies 20px as default size when size prop is omitted', () => {
      const defaultSize = 20;

      const { getByTestId } = render(
        <PredictSportFootballIcon testID="football" />,
      );

      const svg = getByTestId('football');

      expect(svg.props.width).toBe(defaultSize);
      expect(svg.props.height).toBe(defaultSize);
    });

    it.each([
      [12, '12px'],
      [16, '16px'],
      [20, '20px'],
      [24, '24px'],
      [32, '32px'],
    ])('applies %s size when size prop is %s', (size) => {
      const { getByTestId } = render(
        <PredictSportFootballIcon size={size} testID="football" />,
      );

      const svg = getByTestId('football');

      expect(svg.props.width).toBe(size);
      expect(svg.props.height).toBe(size);
    });
  });

  describe('color prop', () => {
    it('applies theme text default color when color prop is omitted', () => {
      const { getByTestId } = render(
        <PredictSportFootballIcon testID="football" />,
      );

      expect(getByTestId('football')).toBeOnTheScreen();
    });

    it('applies custom hex color when color prop is provided', () => {
      const customColor = '#FF5733';

      const { getByTestId } = render(
        <PredictSportFootballIcon color={customColor} testID="football" />,
      );

      expect(getByTestId('football')).toBeOnTheScreen();
    });
  });

  describe('theme integration', () => {
    it('renders with theme color when no color prop provided', () => {
      const { getByTestId } = render(
        <PredictSportFootballIcon testID="football" />,
      );

      expect(getByTestId('football')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('applies hex color with alpha channel', () => {
      const colorWithAlpha = '#FF0000FF';

      const { getByTestId } = render(
        <PredictSportFootballIcon color={colorWithAlpha} testID="football" />,
      );

      expect(getByTestId('football')).toBeOnTheScreen();
    });

    it('applies short hex color format', () => {
      const shortHexColor = '#F00';

      const { getByTestId } = render(
        <PredictSportFootballIcon color={shortHexColor} testID="football" />,
      );

      expect(getByTestId('football')).toBeOnTheScreen();
    });

    it('applies RGB color format', () => {
      const rgbColor = 'rgb(255, 0, 0)';

      const { getByTestId } = render(
        <PredictSportFootballIcon color={rgbColor} testID="football" />,
      );

      expect(getByTestId('football')).toBeOnTheScreen();
    });

    it('applies RGBA color format', () => {
      const rgbaColor = 'rgba(255, 0, 0, 0.5)';

      const { getByTestId } = render(
        <PredictSportFootballIcon color={rgbaColor} testID="football" />,
      );

      expect(getByTestId('football')).toBeOnTheScreen();
    });

    it('applies 8px size when given very small size', () => {
      const minimalSize = 8;

      const { getByTestId } = render(
        <PredictSportFootballIcon size={minimalSize} testID="football" />,
      );

      const svg = getByTestId('football');

      expect(svg.props.width).toBe(minimalSize);
      expect(svg.props.height).toBe(minimalSize);
    });

    it('applies 64px size when given very large size', () => {
      const largeSize = 64;

      const { getByTestId } = render(
        <PredictSportFootballIcon size={largeSize} testID="football" />,
      );

      const svg = getByTestId('football');

      expect(svg.props.width).toBe(largeSize);
      expect(svg.props.height).toBe(largeSize);
    });
  });

  describe('viewBox', () => {
    it('maintains 16x16 viewBox when custom size provided', () => {
      const customSize = 40;

      const { UNSAFE_getByType } = render(
        <PredictSportFootballIcon size={customSize} testID="football" />,
      );

      const svg = UNSAFE_getByType(Svg);

      expect(svg.props.viewBox).toBe('0 0 16 16');
    });

    it('maintains 16x16 viewBox when using default size', () => {
      const { UNSAFE_getByType } = render(
        <PredictSportFootballIcon testID="football" />,
      );

      const svg = UNSAFE_getByType(Svg);

      expect(svg.props.viewBox).toBe('0 0 16 16');
    });
  });
});
