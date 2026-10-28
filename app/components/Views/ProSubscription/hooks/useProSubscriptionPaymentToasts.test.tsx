import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { ToastContext } from '../../../../component-library/components/Toast';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { useProSubscriptionPaymentToasts } from './useProSubscriptionPaymentToasts';

const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockNavigate = jest.fn();
const mockGetCurrentRoute = jest.fn();

jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    getCurrentRoute: () => mockGetCurrentRoute(),
    navigation: {
      navigate: (...args: unknown[]) => mockNavigate(...args),
    },
  },
}));

jest.mock('../../../../util/haptics', () => ({
  playNotification: jest.fn().mockResolvedValue(undefined),
  NotificationMoment: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: () => ({
    colors: {
      success: { default: 'success' },
      error: { default: 'error' },
    },
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastContext.Provider
    value={{
      toastRef: {
        current: {
          showToast: mockShowToast,
          closeToast: mockCloseToast,
        },
      },
    }}
  >
    {children}
  </ToastContext.Provider>
);

describe('useProSubscriptionPaymentToasts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers a Pro Hub action when the user is on another screen', () => {
    mockGetCurrentRoute.mockReturnValue({ name: Routes.WALLET.HOME });
    const { result } = renderHook(() => useProSubscriptionPaymentToasts(), {
      wrapper,
    });

    result.current.showActiveToast();

    const toast = mockShowToast.mock.calls[0][0];
    expect(toast.hasNoTimeout).toBe(true);
    expect(toast.linkButtonOptions.label).toBe(
      strings('pro_subscription.payment.view_membership'),
    );

    toast.linkButtonOptions.onPress();

    expect(mockCloseToast).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.ROOT);
  });

  it('hides the Pro Hub action when the user is already on Pro Hub', () => {
    mockGetCurrentRoute.mockReturnValue({ name: Routes.PRO_HUB.ROOT });
    const { result } = renderHook(() => useProSubscriptionPaymentToasts(), {
      wrapper,
    });

    result.current.showActiveToast();

    const toast = mockShowToast.mock.calls[0][0];
    expect(toast.linkButtonOptions).toBeUndefined();
    expect(toast.hasNoTimeout).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
