// Third party dependencies.
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

// Internal dependencies.
import BasicFunctionalityModal from './BasicFunctionalityModal';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../core/Engine';

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

// Mock Engine with MultichainAccountService
jest.mock('../../../../core/Engine', () => ({
  context: {
    MultichainAccountService: {
      setBasicFunctionality: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('BasicFunctionalityModal', () => {
  const mockRoute = {
    params: {
      caller: 'Settings',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <BasicFunctionalityModal route={mockRoute} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  // Test coverage for the new MultichainAccountService integration
  it('should call MultichainAccountService.setBasicFunctionality when basic functionality is toggled', async () => {
    const mockSetBasicFunctionality = jest
      .spyOn(Engine.context.MultichainAccountService, 'setBasicFunctionality')
      .mockResolvedValue(undefined);

    const { getByText } = renderWithProvider(
      <BasicFunctionalityModal route={mockRoute} />,
      { state: mockInitialState },
    );

    // Find and press the turn off button (when basicFunctionality is enabled)
    const turnOffButton = getByText('Turn off');
    fireEvent.press(turnOffButton);

    await waitFor(() => {
      expect(mockSetBasicFunctionality).toHaveBeenCalledWith(false);
    });
  });

  it('should handle MultichainAccountService.setBasicFunctionality errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      // Mock implementation to suppress console.error during test
    });
    const mockSetBasicFunctionality = jest
      .spyOn(Engine.context.MultichainAccountService, 'setBasicFunctionality')
      .mockRejectedValue(new Error('Test error'));

    const { getByText } = renderWithProvider(
      <BasicFunctionalityModal route={mockRoute} />,
      { state: mockInitialState },
    );

    const turnOffButton = getByText('Turn off');
    fireEvent.press(turnOffButton);

    await waitFor(() => {
      expect(mockSetBasicFunctionality).toHaveBeenCalledWith(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to call MultichainAccountService.setBasicFunctionality:',
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });
});
