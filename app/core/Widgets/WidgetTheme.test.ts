import { darkTheme, lightTheme } from '@metamask/design-tokens';

import {
  buildWidgetTheme,
  darkWidgetTheme,
  getWidgetTheme,
  lightWidgetTheme,
} from './WidgetTheme';

describe('buildWidgetTheme', () => {
  it('maps light theme colors to solid, non-alpha hex values', () => {
    const theme = buildWidgetTheme('light');

    expect(theme.colorScheme).toBe('light');
    expect(theme.colors.background).toBe(lightTheme.colors.background.default);
    expect(theme.colors.surface).toBe(lightTheme.colors.background.alternative);
    expect(theme.colors.textDefault).toBe(lightTheme.colors.text.default);
    expect(theme.colors.textAlternative).toBe(
      lightTheme.colors.text.alternative,
    );
    expect(theme.colors.textMuted).toBe(lightTheme.colors.text.muted);
    expect(theme.colors.primary).toBe(lightTheme.colors.primary.default);
    expect(theme.colors.success).toBe(lightTheme.colors.success.default);
    expect(theme.colors.error).toBe(lightTheme.colors.error.default);
    expect(theme.colors.icon).toBe(lightTheme.colors.icon.default);
    // Must come from `border.default`, never the alpha-suffixed `border.muted`.
    expect(theme.colors.border).toBe(lightTheme.colors.border.default);
  });

  it('maps dark theme colors', () => {
    const theme = buildWidgetTheme('dark');

    expect(theme.colorScheme).toBe('dark');
    expect(theme.colors.background).toBe(darkTheme.colors.background.default);
    expect(theme.colors.border).toBe(darkTheme.colors.border.default);
  });

  it('never emits 8-digit (alpha) hex colors, since @expo/ui parses them as ARGB not RGBA', () => {
    const theme = buildWidgetTheme('light');

    Object.values(theme.colors).forEach((value) => {
      if (value.startsWith('#')) {
        expect(value).toHaveLength(7); // '#' + 6 hex digits, no alpha channel
      }
    });
  });

  it('translates numeric design-token font weights to semantic @expo/ui weight names', () => {
    const theme = buildWidgetTheme('light');

    expect(theme.typography.amountDisplay).toEqual({
      size: lightTheme.typography.sAmountDisplayLg.fontSize,
      weight: 'bold',
    });
    expect(theme.typography.headingMd).toEqual({
      size: lightTheme.typography.sHeadingMD.fontSize,
      weight: 'bold',
    });
    expect(theme.typography.bodyMd).toEqual({
      size: lightTheme.typography.sBodyMD.fontSize,
      weight: 'regular',
    });
    expect(theme.typography.bodySm).toEqual({
      size: lightTheme.typography.sBodySM.fontSize,
      weight: 'regular',
    });
    expect(theme.typography.bodyXs).toEqual({
      size: lightTheme.typography.sBodyXS.fontSize,
      weight: 'regular',
    });
  });

  it('falls back to a regular weight for an unrecognized font-weight token', () => {
    const theme = buildWidgetTheme('light', {
      colors: lightTheme.colors,
      shadows: lightTheme.shadows,
      typography: {
        ...lightTheme.typography,
        sBodyMD: { ...lightTheme.typography.sBodyMD, fontWeight: '999' },
      },
    });

    expect(theme.typography.bodyMd.weight).toBe('regular');
  });

  it('provides a 4px-based spacing scale', () => {
    const theme = buildWidgetTheme('light');

    expect(theme.spacing).toEqual({ xs: 4, sm: 8, md: 12, lg: 16 });
  });

  it('exposes precomputed light/dark theme singletons matching buildWidgetTheme output', () => {
    expect(lightWidgetTheme).toEqual(buildWidgetTheme('light'));
    expect(darkWidgetTheme).toEqual(buildWidgetTheme('dark'));
  });
});

describe('getWidgetTheme', () => {
  it('returns the dark theme singleton for "dark"', () => {
    expect(getWidgetTheme('dark')).toBe(darkWidgetTheme);
  });

  it('returns the light theme singleton for "light"', () => {
    expect(getWidgetTheme('light')).toBe(lightWidgetTheme);
  });
});
