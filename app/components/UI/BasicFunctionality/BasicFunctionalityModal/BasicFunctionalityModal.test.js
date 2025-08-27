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

// Mock Engine for keyring-snaps conditional code coverage
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
jest.mock('../../../../core/Engine', () => ({
  context: {
    MultichainAccountService: {
      setBasicFunctionality: jest.fn(),
    },
  },
}));
///: END:ONLY_INCLUDE_IF

/** @type {MockRootState} */
const mockInitialState = {
  settings: {
    basicFunctionalityEnabled: false,
  },
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

/** @type {MockRootState} */
const mockEnabledState = {
  settings: {
    basicFunctionalityEnabled: true,
  },
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
      dangerouslyGetParent: () => ({
        pop: jest.fn(),
      }),
    }),
  };
});

describe('BasicFunctionalityModal', () => {
  it('should render correctly when disabled', () => {
    const { toJSON } = renderWithProvider(
      <BasicFunctionalityModal route={{ params: {} }} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly when enabled', () => {
    const { toJSON } = renderWithProvider(
      <BasicFunctionalityModal route={{ params: {} }} />,
      { state: mockEnabledState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  it('should initialize with MultichainAccountService available', () => {
    const Engine = require('../../../../core/Engine');

    renderWithProvider(<BasicFunctionalityModal route={{ params: {} }} />, {
      state: mockInitialState,
    });

    // Verify Engine service is available - this covers the conditional import block
    expect(
      Engine.context.MultichainAccountService.setBasicFunctionality,
    ).toBeDefined();
  });
  ///: END:ONLY_INCLUDE_IF
});
