import { renderHook, act } from '@testing-library/react-hooks';
import React from 'react';
import useCopyClipboard from './useCopyClipboard';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { ToastContext } from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

jest.mock('../../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    ToastContext.Provider,
    { value: { toastRef: mockToastRef } },
    children,
  );

describe('useCopyClipboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('copies provided value to system clipboard', async () => {
    const { result } = renderHook(() => useCopyClipboard(), { wrapper });
    const testAddress = '0x1234567890abcdef';

    await act(async () => {
      await result.current(testAddress);
    });

    expect(ClipboardManager.setString).toHaveBeenCalledWith(testAddress);
  });

  it('shows toast with Icon variant after copying', async () => {
    const { result } = renderHook(() => useCopyClipboard(), { wrapper });

    await act(async () => {
      await result.current('0x1234567890abcdef');
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'Icon',
        iconName: IconName.CheckBold,
        hasNoTimeout: false,
      }),
    );
  });

  it('uses custom alert text in toast when provided', async () => {
    const { result } = renderHook(() => useCopyClipboard(), { wrapper });
    const customMessage = 'Transaction ID copied';

    await act(async () => {
      await result.current('0x1234', customMessage);
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: customMessage }],
      }),
    );
  });

  it('skips clipboard and toast when value is empty string', async () => {
    const { result } = renderHook(() => useCopyClipboard(), { wrapper });

    await act(async () => {
      await result.current('');
    });

    expect(ClipboardManager.setString).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('dispatches protectWalletModalVisible after 2 second delay', async () => {
    const { result } = renderHook(() => useCopyClipboard(), { wrapper });

    await act(async () => {
      await result.current('0x1234');
    });

    expect(mockDispatch).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockDispatch).toHaveBeenCalled();
  });
});
