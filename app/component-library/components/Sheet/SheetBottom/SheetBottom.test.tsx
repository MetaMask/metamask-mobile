// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform, View } from 'react-native';

// Internal dependencies.
import SheetBottom from './SheetBottom';

jest.mock('react-native-safe-area-context', () => {
  // using distinct digits for mock rects to make sure they are not mixed up
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('SheetBottom', () => {
  enum PlatformEnum {
    iOS = 'ios',
    Android = 'android',
  }
  const platforms = [PlatformEnum.iOS, PlatformEnum.Android];
  test.each(platforms)('should render correctly on %s', (platform) => {
    Platform.OS = platform;
    const { toJSON } = render(
      <SheetBottom>
        <View />
      </SheetBottom>,
    );
    // The snapshot is the assertion itself, no need for additional assertions here.
    expect(toJSON()).toMatchSnapshot(platform);
  });
});

// Note: React Testing Library handles cleanup automatically, so there's no need for manual cleanup logic.

// Note: This test suite does not contain any specific routing or navigation scenarios.
// The @react-navigation/native mock is set up, but no actual navigation calls are made in the tests.
