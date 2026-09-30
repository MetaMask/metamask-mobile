import React from 'react';
import { darkTheme } from '@metamask/design-tokens';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../../util/theme';
import { AppThemeKey, type Theme } from '../../../../../util/theme/models';
import CardBackdrop from './CardBackdrop';
import { CardBackdropTestIds } from './CardBackdrop.testIds';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

describe('CardBackdrop', () => {
  it('keeps the decoration outside touch and accessibility interactions', () => {
    const { getByTestId } = renderWithProvider(<CardBackdrop />);

    const backdrop = getByTestId(CardBackdropTestIds.CONTAINER, {
      includeHiddenElements: true,
    });

    expect(backdrop.props.pointerEvents).toBe('none');
    expect(backdrop.props.accessibilityElementsHidden).toBe(true);
    expect(backdrop.props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
  });

  it('keeps a grey native light layer visible above the dark screen background', () => {
    const theme: Theme = {
      ...mockTheme,
      ...darkTheme,
      themeAppearance: AppThemeKey.dark,
    };

    const { getByTestId } = renderWithProvider(<CardBackdrop />, { theme });

    const light = getByTestId(CardBackdropTestIds.BASE_LIGHT, {
      includeHiddenElements: true,
    });
    expect(light.props.colors).toEqual([
      theme.colors.border.default,
      theme.colors.background.section,
      theme.colors.background.default,
    ]);
    expect(light.props.colors[0]).not.toBe(theme.colors.background.default);
    expect(light).toHaveStyle({
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it('reserves the spotlights and sparkles for the reveal', () => {
    const { queryByTestId, rerender } = renderWithProvider(<CardBackdrop />);

    expect(
      queryByTestId(CardBackdropTestIds.REVEAL_LIGHTS, {
        includeHiddenElements: true,
      }),
    ).toBeNull();

    rerender(<CardBackdrop variant="reveal" />);

    expect(
      queryByTestId(CardBackdropTestIds.REVEAL_LIGHTS, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
  });
});
