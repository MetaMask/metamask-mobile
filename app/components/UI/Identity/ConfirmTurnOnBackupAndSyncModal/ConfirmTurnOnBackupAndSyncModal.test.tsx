// Third party dependencies.
import React from 'react';

// Internal dependencies.
import ConfirmTurnOnBackupAndSyncModal from './ConfirmTurnOnBackupAndSyncModal';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { toggleBasicFunctionality } from '../../../../actions/settings';

jest.mock('../../../../actions/settings', () => ({
  ...jest.requireActual('../../../../actions/settings'),
  toggleBasicFunctionality: jest.fn(() => jest.fn()),
}));

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

const { InteractionManager } = jest.requireActual('react-native');

InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

const mockEnableBackupAndSync = jest.fn();
const mockTrackEnableBackupAndSyncEvent = jest.fn();

jest.mock('../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../util/navigation/navUtils'),
  useParams: () => ({
    enableBackupAndSync: mockEnableBackupAndSync,
    trackEnableBackupAndSyncEvent: mockTrackEnableBackupAndSyncEvent,
  }),
  useRoute: jest.fn(),
  createNavigationDetails: jest.fn(),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

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

describe('ConfirmTurnOnBackupAndSyncModal', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      <ConfirmTurnOnBackupAndSyncModal navigation={useNavigation()} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('enables basic functionality, then backup and sync', async () => {
    const { getByText } = renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      <ConfirmTurnOnBackupAndSyncModal navigation={useNavigation()} />,
    );

    const confirmButton = getByText('Turn on');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(toggleBasicFunctionality).toHaveBeenCalledWith(true);
      expect(mockTrackEnableBackupAndSyncEvent).toHaveBeenCalled();
      expect(mockEnableBackupAndSync).toHaveBeenCalled();
    });
  });
});
