import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { ToastContext } from '../../component-library/components/Toast/Toast.context';
import { strings } from '../../../locales/i18n';
import { isWatchOnlyAccount } from '../../util/address';
import { useWatchOnlyGuard } from './useWatchOnlyGuard';

jest.mock('react-redux', () => ({
  useSelector: () => '0x5972698398d8c5bBE67C0DB74906236691020417',
}));
jest.mock('../../util/address', () => ({ isWatchOnlyAccount: jest.fn() }));

const mockShowToast = jest.fn();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastContext.Provider
    value={{
      toastRef: {
        current: { showToast: mockShowToast, closeToast: jest.fn() },
      },
    }}
  >
    {children}
  </ToastContext.Provider>
);

describe('useWatchOnlyGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses a watch-only account with the watch-only message', () => {
    jest.mocked(isWatchOnlyAccount).mockReturnValue(true);
    const { result } = renderHook(() => useWatchOnlyGuard(), { wrapper });

    let refused = false;
    act(() => {
      refused = result.current.guard();
    });

    expect(refused).toBe(true);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          { label: strings('watch_only.blocked_title'), isBold: true },
          { label: '\n' },
          { label: strings('watch_only.blocked_message') },
        ],
      }),
    );
  });

  it('lets an account that can sign through', () => {
    jest.mocked(isWatchOnlyAccount).mockReturnValue(false);
    const { result } = renderHook(() => useWatchOnlyGuard(), { wrapper });

    expect(result.current.guard()).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
