// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';
import { Platform, View } from 'react-native';

// Internal dependencies.
import SheetBottom from './SheetBottom';

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
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
