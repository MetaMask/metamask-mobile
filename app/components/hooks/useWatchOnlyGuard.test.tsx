import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { ToastContext } from '../../component-library/components/Toast/Toast.context';
import { ToastVariants } from '../../component-library/components/Toast/Toast.types';
import { strings } from '../../../locales/i18n';
import { useWatchOnlyGuard } from './useWatchOnlyGuard';

const MISSING_TRANSLATION = /\[missing ".*" translation\]/;

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
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

const selectAccountWithKeyring = (type: string) =>
  mockUseSelector.mockImplementation((selector) =>
    selector({
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'account-id',
              accounts: {
                'account-id': {
                  id: 'account-id',
                  address: '0x5972698398d8c5bbe67c0db74906236691020417',
                  type: 'eip155:eoa',
                  metadata: { keyring: { type } },
                },
              },
            },
          },
        },
      },
    } as never),
  );

describe('useWatchOnlyGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses and shows the watch-only message for a watch-only account', () => {
    selectAccountWithKeyring('watch-only');
    const { result } = renderHook(() => useWatchOnlyGuard(), { wrapper });

    let refused = false;
    act(() => {
      refused = result.current.guard();
    });

    expect(result.current.isWatchOnly).toBe(true);
    expect(refused).toBe(true);
    const { labelOptions } = mockShowToast.mock.calls[0][0];
    for (const { label } of labelOptions) {
      expect(label).not.toMatch(MISSING_TRANSLATION);
    }
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: ToastVariants.Plain,
        labelOptions: [
          { label: strings('watch_only.blocked_title'), isBold: true },
          { label: '\n' },
          { label: strings('watch_only.blocked_message') },
        ],
      }),
    );
  });

  it('lets the action through for an account that can sign', () => {
    selectAccountWithKeyring('HD Key Tree');
    const { result } = renderHook(() => useWatchOnlyGuard(), { wrapper });

    let refused = true;
    act(() => {
      refused = result.current.guard();
    });

    expect(result.current.isWatchOnly).toBe(false);
    expect(refused).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('lets the action through when no account is selected', () => {
    mockUseSelector.mockReturnValue(false);
    const { result } = renderHook(() => useWatchOnlyGuard(), { wrapper });

    expect(result.current.guard()).toBe(false);
  });
});
