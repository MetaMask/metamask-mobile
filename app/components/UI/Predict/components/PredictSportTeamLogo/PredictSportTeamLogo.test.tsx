import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictSportTeamLogo from './PredictSportTeamLogo';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';

describe('PredictSportTeamLogo', () => {
  const defaultProps = {
    uri: 'https://example.com/logo.png',
    color: TEST_HEX_COLORS.TEAM_SEA,
    testID: 'team-logo',
  };

  describe('rendering', () => {
    it('renders logo with required props', () => {
      const { getByTestId } = render(
        <PredictSportTeamLogo {...defaultProps} />,
      );

      expect(getByTestId('team-logo')).toBeOnTheScreen();
      expect(getByTestId('team-logo-image')).toBeOnTheScreen();
    });

    it('renders image with correct uri', () => {
      const { getByTestId } = render(
        <PredictSportTeamLogo {...defaultProps} />,
      );

      const image = getByTestId('team-logo-image');
      expect(image.props.source).toEqual({ uri: defaultProps.uri });
    });
  });

  describe('size prop', () => {
    it('uses 48px as default size when size prop is omitted', () => {
      const defaultSize = 48;

      const { getByTestId } = render(
        <PredictSportTeamLogo {...defaultProps} />,
      );

      const container = getByTestId('team-logo');
      const image = getByTestId('team-logo-image');

      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: defaultSize,
            height: defaultSize,
            borderRadius: defaultSize / 2,
          }),
        ]),
      );

      expect(image.props.style).toEqual(
        expect.objectContaining({
          width: defaultSize,
          height: defaultSize,
        }),
      );
    });

    it.each([
      [32, '32px'],
      [48, '48px'],
      [64, '64px'],
      [80, '80px'],
    ])('renders logo at %s size', (size) => {
      const { getByTestId } = render(
        <PredictSportTeamLogo {...defaultProps} size={size} />,
      );

      const container = getByTestId('team-logo');
      const image = getByTestId('team-logo-image');

      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: size,
            height: size,
            borderRadius: size / 2,
          }),
        ]),
      );

      expect(image.props.style).toEqual(
        expect.objectContaining({
          width: size,
          height: size,
        }),
      );
    });
  });

  describe('flipped prop', () => {
    it('accepts flipped prop without error but does not apply transform', () => {
      const { getByTestId } = render(
        <PredictSportTeamLogo {...defaultProps} flipped />,
      );

      const container = getByTestId('team-logo');
      const image = getByTestId('team-logo-image');

      // Ensure no transform is applied
      expect(container.props.style).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            transform: expect.anything(),
          }),
        ]),
      );

      expect(image.props.style).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            transform: expect.anything(),
          }),
        ]),
      );
    });
  });

  describe('edge cases', () => {
    it('renders logo with hex color including alpha channel', () => {
      const colorWithAlpha = TEST_HEX_COLORS.TEAM_SEA_ALPHA;

      const { getByTestId } = render(
        <PredictSportTeamLogo {...defaultProps} color={colorWithAlpha} />,
      );

      const container = getByTestId('team-logo');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: colorWithAlpha,
          }),
        ]),
      );
    });

    it('renders logo with short hex color format', () => {
      const shortHexColor = TEST_HEX_COLORS.WHITE_SHORT;

      const { getByTestId } = render(
        <PredictSportTeamLogo {...defaultProps} color={shortHexColor} />,
      );

      const container = getByTestId('team-logo');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: shortHexColor,
          }),
        ]),
      );
    });

    it('renders logo with RGB color format', () => {
      const rgbColor = 'rgb(0, 34, 68)';

      const { getByTestId } = render(
        <PredictSportTeamLogo {...defaultProps} color={rgbColor} />,
      );

      const container = getByTestId('team-logo');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: rgbColor,
          }),
        ]),
      );
    });

    it('hides image when onError is triggered', () => {
      const { getByTestId, queryByTestId } = render(
        <PredictSportTeamLogo {...defaultProps} />,
      );

      const image = getByTestId('team-logo-image');
      expect(image).toBeOnTheScreen();

      // Trigger error
      fireEvent(image, 'error');

      // Image should be hidden, but container should still be visible
      expect(queryByTestId('team-logo-image')).not.toBeOnTheScreen();
      expect(getByTestId('team-logo')).toBeOnTheScreen();
    });
  });
});
