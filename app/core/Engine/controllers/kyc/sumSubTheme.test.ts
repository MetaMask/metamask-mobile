import { Appearance } from 'react-native';
import { lightTheme, darkTheme } from '@metamask/design-tokens';
import ReduxService from '../../../redux/ReduxService';
import { AppThemeKey } from '../../../../util/theme/models';
import { buildSumSubTheme } from './sumSubTheme';

const mockAppTheme = (appTheme: AppThemeKey) => {
  jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
    getState: () => ({ user: { appTheme } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

const mockOsColorScheme = (colorScheme: 'light' | 'dark') => {
  jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(colorScheme);
};

describe('buildSumSubTheme', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('platform grouping', () => {
    beforeEach(() => {
      mockAppTheme(AppThemeKey.light);
    });

    it('groups the shared sections under universal, which both SDKs read', () => {
      const theme = buildSumSubTheme();

      expect(theme.universal.colors).toBeDefined();
      expect(theme.universal.metrics).toBeDefined();
    });

    it('sends the toolbar colors only to iOS, the only interface with them', () => {
      const theme = buildSumSubTheme();

      expect(theme.ios?.colors).toMatchObject({
        toolbarTint: lightTheme.colors.icon.alternative,
        toolbarBackground: lightTheme.colors.background.default,
      });
      expect(theme.universal.colors).not.toHaveProperty('toolbarTint');
      expect(theme.android?.colors).not.toHaveProperty('toolbarTint');
    });

    it('sends the filled card style only to iOS, the only enum with it', () => {
      const theme = buildSumSubTheme();

      expect(theme.ios?.metrics).toMatchObject({
        documentTypeCardStyle: 'filled',
      });
      expect(theme.universal.metrics).not.toHaveProperty(
        'documentTypeCardStyle',
      );
    });

    it('sends the Android-only colors, absent from the iOS interface', () => {
      const theme = buildSumSubTheme();

      expect(theme.android?.colors).toMatchObject({
        statusBarColor: lightTheme.colors.background.default,
        fieldBorderFocused: lightTheme.colors.primary.default,
      });
    });

    it('keeps links and progress universal, since both SDKs support them', () => {
      const theme = buildSumSubTheme();

      expect(theme.universal.colors).toMatchObject({
        linkButtonContent: lightTheme.colors.primary.default,
        progressBarTint: lightTheme.colors.primary.default,
      });
      expect(theme.android?.colors).not.toHaveProperty('linkButtonContent');
      expect(theme.ios?.colors).not.toHaveProperty('progressBarTint');
    });

    it('includes the shared metrics', () => {
      const theme = buildSumSubTheme();

      expect(theme.universal.metrics).toMatchObject({
        // `rounded-full` at `h-12`, so half the height.
        buttonCornerRadius: 24,
        buttonHeight: 48,
        fieldCornerRadius: 8,
        bottomSheetCornerRadius: 24,
      });
    });
  });

  describe('appearance resolution', () => {
    it('emits single color values rather than light/dark pairs', () => {
      mockAppTheme(AppThemeKey.os);
      mockOsColorScheme('light');

      const theme = buildSumSubTheme();

      expect(theme.universal.colors?.backgroundCommon).toBe(
        lightTheme.colors.background.default,
      );
    });

    it('follows the OS appearance when the app is not pinned', () => {
      mockAppTheme(AppThemeKey.os);
      mockOsColorScheme('dark');

      const theme = buildSumSubTheme();

      expect(theme.universal.colors?.backgroundCommon).toBe(
        darkTheme.colors.background.default,
      );
    });

    it('honours a pinned dark app theme even while the OS is light', () => {
      mockAppTheme(AppThemeKey.dark);
      mockOsColorScheme('light');

      const theme = buildSumSubTheme();

      expect(theme.universal.colors?.backgroundCommon).toBe(
        darkTheme.colors.background.default,
      );
      expect(theme.universal.colors?.contentStrong).toBe(
        darkTheme.colors.text.default,
      );
    });

    it('honours a pinned light app theme even while the OS is dark', () => {
      mockAppTheme(AppThemeKey.light);
      mockOsColorScheme('dark');

      const theme = buildSumSubTheme();

      expect(theme.universal.colors?.backgroundCommon).toBe(
        lightTheme.colors.background.default,
      );
    });

    it.each([
      [AppThemeKey.light, lightTheme],
      [AppThemeKey.dark, darkTheme],
    ])(
      'uses the design system button color, not the link accent, in %s',
      (appTheme, expected) => {
        mockAppTheme(appTheme);

        const theme = buildSumSubTheme();

        expect(theme.universal.colors?.primaryButtonBackground).toBe(
          expected.colors.icon.default,
        );
        expect(theme.universal.colors?.primaryButtonContent).toBe(
          expected.colors.primary.inverse,
        );
        expect(theme.universal.colors?.primaryButtonBackground).not.toBe(
          expected.colors.primary.default,
        );
      },
    );

    it('always uses the dark palette for the camera screen', () => {
      mockAppTheme(AppThemeKey.light);
      mockOsColorScheme('light');

      const theme = buildSumSubTheme();

      expect(theme.universal.colors?.cameraBackground).toBe(
        darkTheme.colors.background.default,
      );
      expect(theme.universal.colors?.cameraContent).toBe(
        darkTheme.colors.icon.default,
      );
    });

    it('falls back to the OS appearance when the store is unavailable', () => {
      jest.spyOn(ReduxService, 'store', 'get').mockImplementation(() => {
        throw new Error('Redux store does not exist!');
      });
      mockOsColorScheme('dark');

      const theme = buildSumSubTheme();

      expect(theme.universal.colors?.backgroundCommon).toBe(
        darkTheme.colors.background.default,
      );
    });
  });
});
