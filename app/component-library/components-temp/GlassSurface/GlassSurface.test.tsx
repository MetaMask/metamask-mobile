import React from 'react';
import { Text, processColor } from 'react-native';
import { render } from '@testing-library/react-native';
import GlassSurface, {
  GLASS_SURFACE_SHEEN_GRADIENT_TEST_ID,
  GLASS_SURFACE_SHEEN_TEST_ID,
  SHEEN_OPACITIES,
} from './GlassSurface';
import { mockTheme, ThemeContext } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import { colorWithOpacity } from '../../../util/colors/colorWithOpacity';

describe('GlassSurface', () => {
  it('renders its children on the glass', () => {
    const { getByTestId, getByText } = render(
      <GlassSurface borderRadius={12} testID="glass">
        <Text>Content</Text>
      </GlassSurface>,
    );

    expect(getByTestId('glass')).toBeOnTheScreen();
    expect(getByText('Content')).toBeOnTheScreen();
  });

  it('rounds and clips the glass to the given radius', () => {
    const { getByTestId } = render(
      <GlassSurface borderRadius={16} testID="glass" />,
    );

    expect(getByTestId('glass')).toHaveStyle({
      borderRadius: 16,
      overflow: 'hidden',
    });
  });

  it('is static unless marked interactive', () => {
    const { getByTestId, rerender } = render(
      <GlassSurface borderRadius={12} testID="glass" />,
    );
    expect(getByTestId('glass').props.isInteractive).toBe(false);

    rerender(<GlassSurface borderRadius={12} testID="glass" isInteractive />);

    expect(getByTestId('glass').props.isInteractive).toBe(true);
  });

  describe('sheen', () => {
    it('draws no sheen by default', () => {
      const { queryByTestId } = render(
        <GlassSurface borderRadius={16} testID="glass" />,
      );

      expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();
    });

    // The native gradient receives processed colors.
    it('covers the glass with the muted-tint sheen on the screen colour', () => {
      const { getByTestId } = render(
        <GlassSurface borderRadius={16} testID="glass" hasSheen>
          <Text>Content</Text>
        </GlassSurface>,
      );
      expect(getByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toHaveStyle({
        backgroundColor: mockTheme.colors.background.default,
      });
      expect(getByTestId(GLASS_SURFACE_SHEEN_GRADIENT_TEST_ID)).toHaveProp(
        'colors',
        SHEEN_OPACITIES[AppThemeKey.light].map((opacity) =>
          processColor(
            colorWithOpacity(mockTheme.colors.background.muted, opacity),
          ),
        ),
      );
    });

    it('uses the dark stops in dark mode', () => {
      const { getByTestId } = render(
        <ThemeContext.Provider
          value={{ ...mockTheme, themeAppearance: AppThemeKey.dark }}
        >
          <GlassSurface borderRadius={16} hasSheen />
        </ThemeContext.Provider>,
      );

      expect(getByTestId(GLASS_SURFACE_SHEEN_GRADIENT_TEST_ID)).toHaveProp(
        'colors',
        SHEEN_OPACITIES[AppThemeKey.dark].map((opacity) =>
          processColor(
            colorWithOpacity(mockTheme.colors.background.muted, opacity),
          ),
        ),
      );
    });
  });
});
