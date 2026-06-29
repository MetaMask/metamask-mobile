import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import DeviceAdded from './DeviceAdded';
import { QrSyncPhases } from '../../../core/QrSync/constants';
import { showExtensionCancelledErrorSheet } from './showExtensionCancelledErrorSheet';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('./showExtensionCancelledErrorSheet', () => ({
  showExtensionCancelledErrorSheet: jest.fn(),
}));

const mockShowExtensionCancelledErrorSheet = jest.mocked(
  showExtensionCancelledErrorSheet,
);

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAcknowledgePeerCancellation = jest.fn();
const mockCancelSession = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../core/Engine', () => ({
  context: {
    QrSyncController: {
      acknowledgePeerCancellation: (...args: unknown[]) =>
        mockAcknowledgePeerCancellation(...args),
      cancelSession: (...args: unknown[]) => mockCancelSession(...args),
    },
  },
}));

const mockSelectQrSyncPhase = jest.fn(() => QrSyncPhases.AWAITING_SYNC_READY);
const mockSelectQrSyncIsSessionActive = jest.fn(() => true);

jest.mock('../../../selectors/qrSyncController', () => ({
  selectQrSyncPhase: () => mockSelectQrSyncPhase(),
  selectQrSyncIsSessionActive: () => mockSelectQrSyncIsSessionActive(),
}));

const renderComponent = () => renderWithProvider(<DeviceAdded />);

describe('DeviceAdded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectQrSyncPhase.mockReturnValue(QrSyncPhases.AWAITING_SYNC_READY);
    mockSelectQrSyncIsSessionActive.mockReturnValue(true);
  });

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

  it('shows the error sheet when the extension cancels the sync', () => {
    mockSelectQrSyncPhase.mockReturnValue(QrSyncPhases.PEER_CANCELLED);
    mockSelectQrSyncIsSessionActive.mockReturnValue(false);

    renderComponent();

    expect(mockShowExtensionCancelledErrorSheet).toHaveBeenCalledTimes(1);
  });

  it('cancels the active session when back is pressed while waiting', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId('device-added-back-button'));

    expect(mockCancelSession).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('acknowledges peer cancellation when back is pressed after extension cancel', () => {
    mockSelectQrSyncPhase.mockReturnValue(QrSyncPhases.PEER_CANCELLED);
    mockSelectQrSyncIsSessionActive.mockReturnValue(false);

    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId('device-added-back-button'));

    expect(mockAcknowledgePeerCancellation).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
