// Third party dependencies.
import React from 'react';

// Internal dependencies.
import ResetNotificationsModal from '.';
import renderWithProvider from '../../../../util/test/renderWithProvider';

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
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
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      getParent: () => ({
        pop: jest.fn(),
      }),
    }),
  };
});

describe('ResetNotificationsModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<ResetNotificationsModal />);
    expect(toJSON()).toMatchSnapshot();
  });
});
