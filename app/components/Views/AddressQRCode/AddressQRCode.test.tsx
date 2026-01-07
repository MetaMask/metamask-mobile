import React from 'react';
import { TouchableOpacity } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { act } from '@testing-library/react-hooks';
import AddressQRCode from './index';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { ToastContext } from '../../../component-library/components/Toast';
import ClipboardManager from '../../../core/ClipboardManager';
import { backgroundState } from '../../../util/test/initial-root-state';

jest.mock('../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-qrcode-svg', () => 'QRCode');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};

const mockCloseQrModal = jest.fn();

const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'account-1',
          accounts: {
            'account-1': {
              id: 'account-1',
              address: mockAddress,
              metadata: { name: 'Account 1' },
              type: 'eip155:eoa' as const,
            },
          },
        },
      },
    },
  },
  user: {
    seedphraseBackedUp: true,
  },
};

const renderComponent = (state = mockInitialState) =>
  renderWithProvider(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <AddressQRCode closeQrModal={mockCloseQrModal} />
    </ToastContext.Provider>,
    { state },
  );

describe('AddressQRCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('copies selected address to clipboard when address text is pressed', async () => {
    const { getByText } = renderComponent();
    const addressText = getByText(/0x 1234/);

    await act(async () => {
      fireEvent.press(addressText);
    });

    await waitFor(() => {
      expect(ClipboardManager.setString).toHaveBeenCalledWith(
        expect.stringContaining('0x'),
      );
    });
  });

  it('shows toast notification after copying address', async () => {
    const { getByText } = renderComponent();
    const addressText = getByText(/0x 1234/);

    await act(async () => {
      fireEvent.press(addressText);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'Icon',
          hasNoTimeout: false,
        }),
      );
    });
  });

  it('calls closeQrModal callback when close button is pressed', async () => {
    const { UNSAFE_getAllByType } = renderComponent();
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const closeButton = touchables[0];

    await act(async () => {
      fireEvent.press(closeButton);
    });

    expect(mockCloseQrModal).toHaveBeenCalledTimes(1);
  });

  it('dispatches protectWalletModalVisible after close when seedphrase not backed up', async () => {
    const stateWithUnbackedSeedphrase = {
      ...mockInitialState,
      user: {
        seedphraseBackedUp: false,
      },
    };
    const { UNSAFE_getAllByType } = renderComponent(
      stateWithUnbackedSeedphrase,
    );
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const closeButton = touchables[0];

    await act(async () => {
      fireEvent.press(closeButton);
    });

    expect(mockCloseQrModal).toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('does not dispatch protectWalletModalVisible when seedphrase is backed up', async () => {
    const { UNSAFE_getAllByType } = renderComponent();
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const closeButton = touchables[0];

    await act(async () => {
      fireEvent.press(closeButton);
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('passes ethereum-prefixed address to QRCode for ETH addresses', () => {
    const { UNSAFE_getByType } = renderComponent();
    const qrCode = UNSAFE_getByType(
      'QRCode' as unknown as React.ComponentType<unknown>,
    );

    expect(qrCode.props.value).toMatch(/^ethereum:0x/);
  });
});
