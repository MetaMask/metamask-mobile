// Third party dependencies.
import React from 'react';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

// Internal dependencies.
import BasicFunctionalityModal from './BasicFunctionalityModal';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';

/**
 * @typedef {import('../../../../reducers').RootState} RootState
 * @typedef {import('redux').DeepPartial<RootState>} MockRootState
 */

interface MockRootState {
  engine: {
    backgroundState: {
      UserStorageController: {
        isProfileSyncingEnabled: boolean;
      };
      NotificationServicesController: {
        isNotificationServicesEnabled: boolean;
      };
    };
  };
}

const mockInitialState: MockRootState = {
  engine: {
    backgroundState: {
      UserStorageController: {
        isProfileSyncingEnabled: false,
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
    SafeAreaProvider: jest.fn().mockImplementation(({ children }: { children: React.ReactNode }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }: { children: (safeAreaInset: typeof inset) => React.ReactNode }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: (): NavigationProp<ParamListBase> => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      dispatch: jest.fn(),
      isFocused: jest.fn(),
      canGoBack: jest.fn(),
      dangerouslyGetState: jest.fn(),
      dangerouslyGetParent: jest.fn().mockReturnValue(undefined),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      setParams: jest.fn(),
    }),
  };
});

describe('BasicFunctionalityModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <BasicFunctionalityModal route={{ params: { caller: 'test' } }} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
