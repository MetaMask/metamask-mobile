import React from 'react';
import { waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import { QrSyncPhases } from '../../../core/QrSync/constants';
import { defaultQrSyncControllerState } from '../../../core/QrSync/QrSyncController';
import VerificationCodeBottomSheet from './VerificationCodeBottomSheet';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        goBack,
      }: {
        children: React.ReactNode;
        goBack?: () => void;
      },
      ref: React.Ref<{
        onCloseBottomSheet: (callback?: () => void) => void;
        onOpenBottomSheet: (callback?: () => void) => void;
      }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: (callback?: () => void) => {
          goBack?.();
          callback?.();
        },
        onOpenBottomSheet: jest.fn(),
      }));

      return ReactActual.createElement(
        View,
        { testID: 'verification-bottom-sheet', onTouchEnd: goBack },
        children,
      );
    },
  );

  const MockBottomSheetHeader = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(
      View,
      { testID: 'verification-bottom-sheet-header' },
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
    mockCanGoBack.mockReturnValue(true);
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
  });

  describe('phase changes', () => {
    it('closes the sheet when not in the OTP display phase', async () => {
      renderComponent({
        phase: QrSyncPhases.AWAITING_SYNC_READY,
        otp: null,
      });

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('does not call goBack when navigation cannot go back', async () => {
      mockCanGoBack.mockReturnValue(false);

      renderComponent({
        phase: QrSyncPhases.AWAITING_SYNC_READY,
        otp: null,
      });

      await waitFor(() => {
        expect(mockCanGoBack).toHaveBeenCalled();
      });

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });
});
