import React, { createContext, useContext } from 'react';
import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HeaderStandardNative from './HeaderStandardNative';
import type { NativeHeaderConfig } from './headerStandardNativeItems';
import {
  NATIVE_HEADER_BAR_HEIGHT,
  useNativeHeader,
} from '../../../components/hooks/useNativeHeader';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../components/hooks/useNativeHeader', () => ({
  NATIVE_HEADER_BAR_HEIGHT: 44,
  useNativeHeader: jest.fn(() => true),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 62, bottom: 0, left: 0, right: 0 }),
}));

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Lets `rerender` swap the screen's content without remounting the navigator.
const ContentContext = createContext<React.ReactNode>(null);
const Screen = () => <>{useContext(ContentContext)}</>;

const inNavigator = (ui: React.ReactNode, navigator: 'stack' | 'tab') => (
  <ContentContext.Provider value={ui}>
    <NavigationContainer>
      {navigator === 'stack' ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Screen" component={Screen} />
        </Stack.Navigator>
      ) : (
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen name="Screen" component={Screen} />
        </Tab.Navigator>
      )}
    </NavigationContainer>
  </ContentContext.Provider>
);

const buildConfig = (onBack: () => void): NativeHeaderConfig => ({
  title: 'Settings',
  left: [
    {
      identifier: 'header-back',
      symbol: 'chevron.backward',
      label: 'Back',
      isDisabled: false,
    },
  ],
  right: [],
  handlers: { 'header-back': onBack },
});

const fallback = <Text>JS header</Text>;

const nativeHeader = (config: NativeHeaderConfig, testID?: string) => (
  <HeaderStandardNative config={config} fallback={fallback} testID={testID} />
);

const lastHeaderConfig = () => {
  const calls = jest.mocked(useNativeHeader).mock.calls;
  return calls[calls.length - 1][0];
};

describe('HeaderStandardNative', () => {
  beforeEach(() => {
    jest.mocked(useNativeHeader).mockClear();
    jest.mocked(useSelector).mockReturnValue(true);
  });

  it('leaves a spacer as tall as the native bar in the header slot', () => {
    const { getByTestId } = render(
      inNavigator(nativeHeader(buildConfig(jest.fn()), 'header'), 'stack'),
    );

    expect(getByTestId('header')).toHaveStyle({
      height: 62 + NATIVE_HEADER_BAR_HEIGHT,
    });
  });

  it('keeps UIKit scroll edge effect off behind the spacer', () => {
    render(inNavigator(nativeHeader(buildConfig(jest.fn())), 'stack'));

    expect(lastHeaderConfig()).toEqual(
      expect.objectContaining({ hidesScrollEdgeEffect: true }),
    );
  });

  describe('with content scrolling under the bar', () => {
    it('renders no spacer and reports the bar height', () => {
      const onInset = jest.fn();

      const { queryByTestId } = render(
        inNavigator(
          <HeaderStandardNative
            config={buildConfig(jest.fn())}
            fallback={fallback}
            testID="header"
            onInset={onInset}
          />,
          'stack',
        ),
      );

      expect(queryByTestId('header')).toBeNull();
      expect(onInset).toHaveBeenLastCalledWith(62 + NATIVE_HEADER_BAR_HEIGHT);
    });

    it('turns on the UIKit scroll edge effect', () => {
      render(
        inNavigator(
          <HeaderStandardNative
            config={buildConfig(jest.fn())}
            fallback={fallback}
            onInset={jest.fn()}
          />,
          'stack',
        ),
      );

      expect(lastHeaderConfig()).toEqual(
        expect.objectContaining({ hidesScrollEdgeEffect: false }),
      );
    });

    it('reports 0 when the bar goes away', () => {
      const onInset = jest.fn();
      const { unmount } = render(
        inNavigator(
          <HeaderStandardNative
            config={buildConfig(jest.fn())}
            fallback={fallback}
            onInset={onInset}
          />,
          'stack',
        ),
      );

      unmount();

      expect(onInset).toHaveBeenLastCalledWith(0);
    });

    it('never reports an inset while glassHeaders is off', () => {
      jest.mocked(useSelector).mockReturnValue(false);
      const onInset = jest.fn();

      render(
        inNavigator(
          <HeaderStandardNative
            config={buildConfig(jest.fn())}
            fallback={fallback}
            onInset={onInset}
          />,
          'stack',
        ),
      );

      expect(onInset).not.toHaveBeenCalled();
    });
  });

  it('shows the JS header and leaves the native bar alone while glassHeaders is off', () => {
    jest.mocked(useSelector).mockReturnValue(false);

    const { getByText, queryByTestId } = render(
      inNavigator(nativeHeader(buildConfig(jest.fn()), 'header'), 'stack'),
    );

    expect(getByText('JS header')).toBeOnTheScreen();
    expect(queryByTestId('header')).toBeNull();
    expect(useNativeHeader).not.toHaveBeenCalled();
  });

  it('shows the JS header outside a stack navigator', () => {
    const { getByText } = render(
      inNavigator(nativeHeader(buildConfig(jest.fn())), 'tab'),
    );

    expect(getByText('JS header')).toBeOnTheScreen();
    expect(useNativeHeader).not.toHaveBeenCalled();
  });

  it('shows the JS header outside any navigator', () => {
    const { getByText } = render(nativeHeader(buildConfig(jest.fn())));

    expect(getByText('JS header')).toBeOnTheScreen();
    expect(useNativeHeader).not.toHaveBeenCalled();
  });

  it('hands the title and buttons to the native bar', () => {
    const onBack = jest.fn();
    render(inNavigator(nativeHeader(buildConfig(onBack)), 'stack'));

    const config = lastHeaderConfig();
    const [backItem] = config?.leftItems?.() ?? [];

    expect(config).toEqual(
      expect.objectContaining({ title: 'Settings', hidesBackButton: true }),
    );
    expect(backItem).toEqual(
      expect.objectContaining({ type: 'button', identifier: 'header-back' }),
    );
    if (backItem?.type === 'button') {
      backItem.onPress();
    }
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the items stable across renders with an unchanged look', () => {
    const { rerender } = render(
      inNavigator(nativeHeader(buildConfig(jest.fn())), 'stack'),
    );
    const firstItems = lastHeaderConfig()?.leftItems;

    rerender(inNavigator(nativeHeader(buildConfig(jest.fn())), 'stack'));

    expect(lastHeaderConfig()?.leftItems).toBe(firstItems);
  });

  it('calls the latest press handler after a re-render', () => {
    const firstOnBack = jest.fn();
    const nextOnBack = jest.fn();
    const { rerender } = render(
      inNavigator(nativeHeader(buildConfig(firstOnBack)), 'stack'),
    );
    rerender(inNavigator(nativeHeader(buildConfig(nextOnBack)), 'stack'));

    const [backItem] = lastHeaderConfig()?.leftItems?.() ?? [];
    if (backItem?.type === 'button') {
      backItem.onPress();
    }

    expect(nextOnBack).toHaveBeenCalledTimes(1);
    expect(firstOnBack).not.toHaveBeenCalled();
  });
});
