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

const containerStyle = { marginTop: 8 };
const contentStyle = { padding: 4 };

describe('GlassSurface', () => {
  it('renders its children on the glass', () => {
    const { getByTestId, getByText } = render(
      <GlassSurface radiusClassName="rounded-xl" testID="glass">
        <Text>Content</Text>
      </GlassSurface>,
    );

    expect(getByTestId('glass')).toBeOnTheScreen();
    expect(getByText('Content')).toBeOnTheScreen();
  });

  it('rounds and clips the glass to the radius token', () => {
    const { getByTestId } = render(
      <GlassSurface radiusClassName="rounded-2xl" testID="glass" />,
    );

    expect(getByTestId('glass')).toHaveStyle({
      borderRadius: 16,
      overflow: 'hidden',
    });
  });

  it('is static unless marked interactive', () => {
    const { getByTestId, rerender } = render(
      <GlassSurface radiusClassName="rounded-xl" testID="glass" />,
    );
    expect(getByTestId('glass').props.isInteractive).toBe(false);

    rerender(
      <GlassSurface
        radiusClassName="rounded-xl"
        testID="glass"
        isInteractive
      />,
    );

    expect(getByTestId('glass').props.isInteractive).toBe(true);
  });

  describe('sheen', () => {
    it('draws no sheen by default', () => {
      const { queryByTestId } = render(
        <GlassSurface radiusClassName="rounded-2xl" testID="glass" />,
      );

      expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();
    });

    // The native gradient receives processed colors.
    it('covers the glass with the muted-tint sheen on the screen colour', () => {
      const { getByTestId } = render(
        <GlassSurface radiusClassName="rounded-2xl" testID="glass" hasSheen>
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
          <GlassSurface radiusClassName="rounded-2xl" hasSheen />
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

  describe('opaque surface', () => {
    it('draws the muted surface in the same shape when glass is off', () => {
      const { getByTestId, getByText } = render(
        <GlassSurface isGlass={false} radiusClassName="rounded-xl" testID="s">
          <Text>Content</Text>
        </GlassSurface>,
      );

      expect(getByTestId('s')).toHaveStyle({
        backgroundColor: mockTheme.colors.background.muted,
        borderRadius: 12,
      });
      expect(getByText('Content')).toBeOnTheScreen();
    });

    it('keeps the glass-only sheen and touch response off', () => {
      const { getByTestId, queryByTestId } = render(
        <GlassSurface
          isGlass={false}
          radiusClassName="rounded-xl"
          isInteractive
          hasSheen
          testID="s"
        />,
      );

      expect(getByTestId('s').props.isInteractive).toBeUndefined();
      expect(queryByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).not.toBeOnTheScreen();
    });

    it('applies both the container and content styles to its one view', () => {
      const { getByTestId } = render(
        <GlassSurface
          isGlass={false}
          radiusClassName="rounded-xl"
          containerStyle={containerStyle}
          style={contentStyle}
          testID="s"
        />,
      );

      expect(getByTestId('s')).toHaveStyle({ marginTop: 8, padding: 4 });
    });

    it('does not clip its content', () => {
      const { getByTestId } = render(
        <GlassSurface
          isGlass={false}
          radiusClassName="rounded-xl"
          testID="s"
        />,
      );

      expect(getByTestId('s')).not.toHaveStyle({ overflow: 'hidden' });
    });
  });
});
