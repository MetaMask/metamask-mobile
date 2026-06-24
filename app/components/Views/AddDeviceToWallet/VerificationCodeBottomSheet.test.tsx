import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import { QrSyncPhases } from '../../../core/QrSync/constants';
import { defaultQrSyncControllerState } from '../../../core/QrSync/QrSyncController';
import VerificationCodeBottomSheet from './VerificationCodeBottomSheet';

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

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');

  const MockBottomSheet = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(
      View,
      { testID: 'verification-bottom-sheet' },
      children,
    );

  const MockBottomSheetHeader = ({
    children,
    onClose,
  }: {
    children: React.ReactNode;
    onClose?: () => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID: 'verification-bottom-sheet-header' },
      ReactActual.createElement(
        Pressable,
        { testID: 'verification-code-close-button', onPress: onClose },
        ReactActual.createElement(RNText, {}, 'close'),
      ),
      ReactActual.createElement(RNText, {}, children),
    );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

const renderComponent = (
  qrSyncState: Partial<typeof defaultQrSyncControllerState> = {
    phase: QrSyncPhases.DISPLAYING_OTP,
    otp: { otp: '123456', deadline: Date.now() + 30_000 },
  },
) =>
  renderWithProvider(<VerificationCodeBottomSheet />, {
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

describe('VerificationCodeBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the bottom sheet header title', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.enter_code_on_extension')),
      ).toBeOnTheScreen();
    });

    it('renders the description text', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(
          strings('app_settings.add_device.enter_code_on_extension_desc'),
        ),
      ).toBeOnTheScreen();
    });

    it('renders the OTP from QR sync state', () => {
      const { getByText } = renderComponent();

      expect(getByText('123456')).toBeOnTheScreen();
    });

    it('renders the done button', () => {
      const { getByText } = renderComponent();

      expect(
        getByText(strings('app_settings.add_device.done')),
      ).toBeOnTheScreen();
    });
  });

  describe('done button', () => {
    it('calls navigation.goBack when done button is pressed', () => {
      const { getByText } = renderComponent();

      fireEvent.press(getByText(strings('app_settings.add_device.done')));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('close button', () => {
    it('calls navigation.goBack when close button is pressed', () => {
      const { getByTestId } = renderComponent();

      fireEvent.press(getByTestId('verification-code-close-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('phase changes', () => {
    it('closes the sheet when not in the OTP display phase', async () => {
      renderComponent({
        phase: QrSyncPhases.CONNECTED,
        otp: null,
      });

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });
});
