import React, { useContext } from 'react';
import { Platform, StatusBar, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { darkTheme } from '@metamask/design-tokens';
import { ThemeContext } from '../../../../../util/theme';
import { AppThemeKey, Theme } from '../../../../../util/theme/models';
import ForcedDarkThemeProvider from './ForcedDarkThemeProvider';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const ReactActual = jest.requireActual('react');
  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    Theme: { Light: 'light', Dark: 'dark' },
  };
});

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
    const { getByText } = render(
      <ForcedDarkThemeProvider>
        <Text>child</Text>
      </ForcedDarkThemeProvider>,
    );
    expect(getByText('child')).toBeOnTheScreen();
  });

  it('supplies the dark theme via ThemeContext to descendants', () => {
    const { getByTestId } = render(
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
    render(
      <ForcedDarkThemeProvider>
        <Text>child</Text>
      </ForcedDarkThemeProvider>,
    );
    expect(setBarStyleSpy).toHaveBeenCalledWith('light-content', true);
  });

  it('on Android, sets translucent status bar and transparent background', () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'android',
    });

    render(
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

    render(
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
});
