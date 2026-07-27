import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import { QrSyncPhases } from '../../../core/QrSync/constants';
import { defaultQrSyncControllerState } from '../../../core/QrSync/QrSyncController';
import DeviceAdded from './DeviceAdded';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    QrSyncController: {
      cancelSession: jest.fn(),
      resetState: jest.fn(),
    },
  },
}));

import Engine from '../../../core/Engine';

const mockCancelSession = Engine.context.QrSyncController
  .cancelSession as jest.Mock;
const mockResetState = Engine.context.QrSyncController.resetState as jest.Mock;

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

const renderComponent = (
  qrSyncState: Partial<typeof defaultQrSyncControllerState> = {},
) =>
  renderWithProvider(<DeviceAdded />, {
    state: {
      engine: {
        backgroundState: {
          QrSyncController: {
            ...defaultQrSyncControllerState,
            ...qrSyncState,
          },
        },
      },
    },
  });

describe('DeviceAdded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the waiting for extension screen', () => {
      const { getByText, getByTestId } = renderComponent();

      expect(getByTestId('device-added-loader')).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.add_device.waiting_for_extension')),
      ).toBeOnTheScreen();
      expect(
        getByText(
          strings('app_settings.add_device.waiting_for_extension_description'),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('back navigation', () => {
    it('calls navigation.goBack when back button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('device-added-back-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('cancels the QR sync session when back is pressed during an active session', () => {
      const { getByTestId } = renderComponent({
        phase: QrSyncPhases.AWAITING_SYNC_READY,
      });

      fireEvent.press(getByTestId('device-added-back-button'));

      expect(mockCancelSession).toHaveBeenCalledTimes(1);
      expect(mockResetState).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('resets QR sync state when back is pressed after extension completed', () => {
      const { getByTestId } = renderComponent({
        phase: QrSyncPhases.COMPLETED,
      });

      fireEvent.press(getByTestId('device-added-back-button'));

      expect(mockCancelSession).not.toHaveBeenCalled();
      expect(mockResetState).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
