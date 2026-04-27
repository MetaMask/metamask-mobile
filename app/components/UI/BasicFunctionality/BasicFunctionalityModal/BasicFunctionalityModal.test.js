// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import BasicFunctionalityModal from './BasicFunctionalityModal';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { toggleBasicFunctionality } from '../../../../actions/settings';

/** @type {{ caller: string }} */
let mockRouteParams;

/**
 * @typedef {import('../../../../reducers').RootState} RootState
 * @typedef {import('redux').DeepPartial<RootState>} MockRootState
 */

/** @type {MockRootState} */
const mockInitialState = {
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
      isFocused: jest.fn(() => true),
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

// Mock the toggleBasicFunctionality thunk action
jest.mock('../../../../actions/settings', () => ({
  toggleBasicFunctionality: jest.fn(() => () => Promise.resolve()),
}));

describe('BasicFunctionalityModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { caller: 'Settings' };
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<BasicFunctionalityModal />, {
      state: mockInitialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  // Test coverage for the new thunk action integration
  it('should call toggleBasicFunctionality thunk action when toggling', () => {
    const { getByText } = renderWithProvider(<BasicFunctionalityModal />, {
      state: mockInitialState,
    });

    // Must check the checkbox first to enable the "Turn off" button
    const checkbox = getByText('I understand and want to continue');
    fireEvent.press(checkbox);

    // Now press the turn off button (when basicFunctionality is enabled)
    const turnOffButton = getByText('Turn off');
    fireEvent.press(turnOffButton);

    expect(toggleBasicFunctionality).toHaveBeenCalledWith(false);
  });
});
