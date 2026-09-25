// Third party dependencies.
import React from 'react';

// Internal dependencies.
import ConfirmTurnOnBackupAndSyncModal from './ConfirmTurnOnBackupAndSyncModal';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { toggleBasicFunctionality } from '../../../../actions/settings';
import { strings } from '../../../../../locales/i18n';

jest.mock('../../../../actions/settings', () => ({
  ...jest.requireActual('../../../../actions/settings'),
  toggleBasicFunctionality: jest.fn(() => jest.fn()),
}));

// Spy on the props the real sheet receives, since overlay taps and swipe-down
// are only reachable through its `isInteractable` prop.
const mockBottomSheetProps = jest.fn(
  (_props: { isInteractable?: boolean }) => undefined,
);
jest.mock('@metamask/design-system-react-native', () => {
  const actualDesignSystem = jest.requireActual(
    '@metamask/design-system-react-native',
  );
  const actualReact = jest.requireActual('react');

  return {
    ...actualDesignSystem,
    BottomSheet: actualReact.forwardRef(
      (props: { isInteractable?: boolean }, ref: unknown) => {
        mockBottomSheetProps(props);
        return actualReact.createElement(actualDesignSystem.BottomSheet, {
          ...props,
          ref,
        });
      },
    ),
  };
});

const getLatestIsInteractable = () => {
  const { calls } = mockBottomSheetProps.mock;
  return calls[calls.length - 1][0].isInteractable;
};

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

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: mockGoBack,
      reset: jest.fn(),
      getParent: () => ({
        pop: jest.fn(),
      }),
      isFocused: jest.fn(() => true),
    }),
  };
});

describe('ConfirmTurnOnBackupAndSyncModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and confirm button', () => {
    const { getByText } = renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      <ConfirmTurnOnBackupAndSyncModal navigation={useNavigation()} />,
    );

    expect(getByText(strings('backupAndSync.enable.title'))).toBeOnTheScreen();
    expect(
      getByText(strings('default_settings.sheet.buttons.turn_on')),
    ).toBeOnTheScreen();
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

  it('dismisses the modal route after confirming', async () => {
    const { getByText } = renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      <ConfirmTurnOnBackupAndSyncModal navigation={useNavigation()} />,
    );

    fireEvent.press(
      getByText(strings('default_settings.sheet.buttons.turn_on')),
    );

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('dismisses the modal route after cancelling', async () => {
    const { getByText } = renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      <ConfirmTurnOnBackupAndSyncModal navigation={useNavigation()} />,
    );

    fireEvent.press(
      getByText(strings('default_settings.sheet.buttons.cancel')),
    );

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('stays open until backup and sync finishes enabling', async () => {
    let resolveEnableBackupAndSync: () => void = () => undefined;
    mockEnableBackupAndSync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveEnableBackupAndSync = resolve;
        }),
    );

    const { getByText } = renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      <ConfirmTurnOnBackupAndSyncModal navigation={useNavigation()} />,
    );

    fireEvent.press(
      getByText(strings('default_settings.sheet.buttons.turn_on')),
    );

    await waitFor(() => {
      expect(mockEnableBackupAndSync).toHaveBeenCalled();
    });
    expect(mockGoBack).not.toHaveBeenCalled();

    await act(async () => {
      resolveEnableBackupAndSync();
    });

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('locks out overlay taps and swipe-down while enabling', async () => {
    let resolveEnableBackupAndSync: () => void = () => undefined;
    mockEnableBackupAndSync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveEnableBackupAndSync = resolve;
        }),
    );

    const { getByText } = renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      <ConfirmTurnOnBackupAndSyncModal navigation={useNavigation()} />,
    );

    expect(getLatestIsInteractable()).toBe(true);

    fireEvent.press(
      getByText(strings('default_settings.sheet.buttons.turn_on')),
    );

    await waitFor(() => {
      expect(getLatestIsInteractable()).toBe(false);
    });

    await act(async () => {
      resolveEnableBackupAndSync();
    });
  });

  it('ignores cancel while backup and sync is being enabled', async () => {
    let resolveEnableBackupAndSync: () => void = () => undefined;
    mockEnableBackupAndSync.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveEnableBackupAndSync = resolve;
        }),
    );

    const { getByText } = renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      <ConfirmTurnOnBackupAndSyncModal navigation={useNavigation()} />,
    );

    fireEvent.press(
      getByText(strings('default_settings.sheet.buttons.turn_on')),
    );

    await waitFor(() => {
      expect(mockEnableBackupAndSync).toHaveBeenCalled();
    });

    fireEvent.press(
      getByText(strings('default_settings.sheet.buttons.cancel')),
    );

    expect(mockGoBack).not.toHaveBeenCalled();

    await act(async () => {
      resolveEnableBackupAndSync();
    });
  });
});
