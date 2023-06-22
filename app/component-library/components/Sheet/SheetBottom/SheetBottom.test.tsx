// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';
import { Platform, View } from 'react-native';

// Internal dependencies.
import SheetBottom from './SheetBottom';

jest.mock('react-native-safe-area-context', () => {
  // using disting digits for mock rects to make sure they are not mixed up
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
    const wrapper = shallow(
      <SheetBottom>
        <View />
      </SheetBottom>,
    );
    expect(wrapper).toMatchSnapshot(platform);
  });
});
