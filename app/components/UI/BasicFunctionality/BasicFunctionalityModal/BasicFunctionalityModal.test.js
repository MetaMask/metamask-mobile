// Third party dependencies.
import React from 'react';

// Internal dependencies.
import BasicFunctionalityModal from './BasicFunctionalityModal';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';

/**
 * @typedef {import('../../../../reducers').RootState} RootState
 * @typedef {import('redux').DeepPartial<RootState>} MockRootState
 */

/** @type {MockRootState} */
const mockInitialState = {
  engine: {
    backgroundState: {
      UserStorageController: {
        isBackupAndSyncEnabled: false,
      },
      NotificationServicesController: {
        isNotificationServicesEnabled: false,
      },
    },
  },
};

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
    }),
  };
});

describe('BasicFunctionalityModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <BasicFunctionalityModal navigation={useNavigation()} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
