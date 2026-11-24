import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { GlassView } from 'expo-glass-effect';
import PredictPortfolioAction from './PredictPortfolioAction';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../../../../../../../component-library/components-temp/BoxGlass';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';

// The glass tests need the OS to draw glass, which Jest can't.
jest.mock('../../../../../../../component-library/hooks/useLiquidGlass', () => {
  const actual = jest.requireActual(
    '../../../../../../../component-library/hooks/useLiquidGlass',
  );
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: true,
    }),
  };
});

describe('PredictPortfolioAction', () => {
  const defaultProps = {
    iconName: IconName.Add,
    label: 'Add funds',
    onPress: jest.fn(),
    testID: 'predict-portfolio-action',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes the supplied callback when pressed', () => {
    renderWithProvider(<PredictPortfolioAction {...defaultProps} />);

    fireEvent.press(screen.getByTestId(defaultProps.testID));

    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('does not invoke the callback when disabled', () => {
    renderWithProvider(<PredictPortfolioAction {...defaultProps} disabled />);

    fireEvent.press(screen.getByTestId(defaultProps.testID));

    expect(defaultProps.onPress).not.toHaveBeenCalled();
  });

  it('renders the badge when a positive count is provided', () => {
    renderWithProvider(
      <PredictPortfolioAction {...defaultProps} badgeCount={2} />,
    );

    expect(
      screen.getByTestId(PREDICT_PORTFOLIO_TEST_IDS.ACTION_BADGE),
    ).toBeOnTheScreen();
  });

  describe('glass', () => {
    it('keeps the muted tile by default', () => {
      const { UNSAFE_queryAllByType } = renderWithProvider(
        <PredictPortfolioAction {...defaultProps} />,
      );

      expect(UNSAFE_queryAllByType(GlassView)).toHaveLength(0);
    });

    it('draws the tile on interactive glass and keeps it pressable', () => {
      const { UNSAFE_getByType } = renderWithProvider(
        <PredictPortfolioAction {...defaultProps} isGlass />,
      );

      expect(UNSAFE_getByType(GlassView).props.isInteractive).toBe(true);
      expect(screen.getByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(defaultProps.testID));

      expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
    });

    it('sizes the glass tile from its content instead of a zero flex basis', () => {
      const { UNSAFE_getByType } = renderWithProvider(
        <PredictPortfolioAction {...defaultProps} isGlass />,
      );

      const glassStyle = StyleSheet.flatten(
        UNSAFE_getByType(GlassView).props.style,
      );
      const tileStyle = StyleSheet.flatten(
        screen.getByTestId(defaultProps.testID).props.style,
      );

      expect(glassStyle.flexBasis).toBeUndefined();
      expect(tileStyle.flexBasis).toBeUndefined();
    });

    it('stops the glass reacting to touch while disabled', () => {
      const { UNSAFE_getByType } = renderWithProvider(
        <PredictPortfolioAction {...defaultProps} isGlass disabled />,
      );

      expect(UNSAFE_getByType(GlassView).props.isInteractive).toBe(false);

      fireEvent.press(screen.getByTestId(defaultProps.testID));

      expect(defaultProps.onPress).not.toHaveBeenCalled();
    });
  });
});
