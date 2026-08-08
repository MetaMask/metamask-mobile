import React, { useContext } from 'react';
import { Appearance, Platform, StatusBar, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { darkTheme } from '@metamask/design-tokens';
import { ThemeContext } from '../../../../../util/theme';
import { AppThemeKey, Theme } from '../../../../../util/theme/models';
import ForcedDarkThemeProvider from './ForcedDarkThemeProvider';
import { Theme as DesignSystemTheme } from '@metamask/design-system-twrnc-preset';

let mockIsPureBlackEnabled = false;

jest.mock('../../../../../util/theme/themeUtils', () => ({
  get isPureBlackEnabled() {
    return mockIsPureBlackEnabled;
  },
}));

const mockDesignSystemThemeProvider = jest.fn(
  ({ children }: { children: React.ReactNode }) => children,
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  ThemeProvider: (props: {
    children: React.ReactNode;
    isPureBlack?: boolean;
    theme?: string;
  }) => mockDesignSystemThemeProvider(props),
  Theme: { Light: 'light', Dark: 'dark' },
}));

const mockStore = configureMockStore();
const renderWithStore = (
  ui: React.ReactElement,
  appTheme: AppThemeKey = AppThemeKey.light,
) => {
  const store = mockStore({ user: { appTheme } });
  return render(<Provider store={store}>{ui}</Provider>);
};

const ThemeProbe: React.FC = () => {
  const theme = useContext<Theme | undefined>(ThemeContext);
  return (
    <>
      <Text testID="appearance">{theme?.themeAppearance ?? 'none'}</Text>
      <Text testID="background">
        {theme?.colors?.background?.default ?? 'none'}
      </Text>
    </>
  );
};

describe('ForcedDarkThemeProvider', () => {
  let setBarStyleSpy: jest.SpyInstance;
  let setTranslucentSpy: jest.SpyInstance;
  let setBackgroundColorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPureBlackEnabled = false;
    setBarStyleSpy = jest.spyOn(StatusBar, 'setBarStyle').mockImplementation();
    setTranslucentSpy = jest
      .spyOn(StatusBar, 'setTranslucent')
      .mockImplementation();
    setBackgroundColorSpy = jest
      .spyOn(StatusBar, 'setBackgroundColor')
      .mockImplementation();
  });

  afterEach(() => {
    setBarStyleSpy.mockRestore();
    setTranslucentSpy.mockRestore();
    setBackgroundColorSpy.mockRestore();
  });

  it('renders its children', () => {
    const { getByText } = renderWithStore(
      <ForcedDarkThemeProvider>
        <Text>child</Text>
      </ForcedDarkThemeProvider>,
    );
    expect(getByText('child')).toBeOnTheScreen();
  });

  it('supplies the dark theme via ThemeContext to descendants', () => {
    const { getByTestId } = renderWithStore(
      <ForcedDarkThemeProvider>
        <ThemeProbe />
      </ForcedDarkThemeProvider>,
    );
    expect(getByTestId('appearance')).toHaveTextContent(AppThemeKey.dark);
    expect(getByTestId('background')).toHaveTextContent(
      darkTheme.colors.background.default,
    );
  });

  it('forces StatusBar to light-content on mount', () => {
    renderWithStore(
      <ForcedDarkThemeProvider>
        <Text>child</Text>
      </ForcedDarkThemeProvider>,
    );
    expect(setBarStyleSpy).toHaveBeenCalledWith('light-content', true);
  });

  it('restores dark-content StatusBar on unmount for a light-theme user', () => {
    const { unmount } = renderWithStore(
      <ForcedDarkThemeProvider>
        <Text>child</Text>
      </ForcedDarkThemeProvider>,
      AppThemeKey.light,
    );
    setBarStyleSpy.mockClear();
    unmount();
    expect(setBarStyleSpy).toHaveBeenCalledWith('dark-content', true);
  });

  it('restores light-content StatusBar on unmount for a dark-theme user', () => {
    const { unmount } = renderWithStore(
      <ForcedDarkThemeProvider>
        <Text>child</Text>
      </ForcedDarkThemeProvider>,
      AppThemeKey.dark,
    );
    setBarStyleSpy.mockClear();
    unmount();
    expect(setBarStyleSpy).toHaveBeenCalledWith('light-content', true);
  });

  it('restores StatusBar from OS color scheme on unmount when appTheme is OS', () => {
    const getColorSchemeSpy = jest
      .spyOn(Appearance, 'getColorScheme')
      .mockReturnValue('light');
    const { unmount } = renderWithStore(
      <ForcedDarkThemeProvider>
        <Text>child</Text>
      </ForcedDarkThemeProvider>,
      AppThemeKey.os,
    );
    setBarStyleSpy.mockClear();
    unmount();
    expect(setBarStyleSpy).toHaveBeenCalledWith('dark-content', true);
    getColorSchemeSpy.mockRestore();
  });

  it('on Android, sets translucent status bar and transparent background', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });

    renderWithStore(
      <ForcedDarkThemeProvider>
        <Text>child</Text>
      </ForcedDarkThemeProvider>,
    );

    expect(setTranslucentSpy).toHaveBeenCalledWith(true);
    expect(setBackgroundColorSpy).toHaveBeenCalledWith('transparent');

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOS,
    });
  });

  it('on iOS, does not touch translucent or background-color StatusBar settings', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });

    renderWithStore(
      <ForcedDarkThemeProvider>
        <Text>child</Text>
      </ForcedDarkThemeProvider>,
    );

    expect(setTranslucentSpy).not.toHaveBeenCalled();
    expect(setBackgroundColorSpy).not.toHaveBeenCalled();

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOS,
    });
  });

  describe('isPureBlack', () => {
    it('passes isPureBlack false to DesignSystemThemeProvider when preview flag is off', () => {
      renderWithStore(
        <ForcedDarkThemeProvider>
          <Text>child</Text>
        </ForcedDarkThemeProvider>,
      );

      expect(mockDesignSystemThemeProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          isPureBlack: false,
          theme: DesignSystemTheme.Dark,
        }),
      );
    });

    it('passes isPureBlack true to DesignSystemThemeProvider when preview flag is on', () => {
      mockIsPureBlackEnabled = true;

      renderWithStore(
        <ForcedDarkThemeProvider>
          <Text>child</Text>
        </ForcedDarkThemeProvider>,
      );

      expect(mockDesignSystemThemeProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          isPureBlack: true,
          theme: DesignSystemTheme.Dark,
        }),
      );
    });
  });
});
