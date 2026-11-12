import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { ToastContext } from '../../../../component-library/components/Toast';
import { CardActions } from '../util/metrics';
import { useImmersveKycOutcome } from './useImmersveKycOutcome';

const mockLogout = jest.fn();
const mockRemoveQueries = jest.fn();
const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockShowToast = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ removeQueries: mockRemoveQueries }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: () => 'immersve',
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      logout: () => mockLogout(),
    },
  },
}));

jest.mock('../../../../core/redux/slices/card', () => ({
  resetOnboardingState: () => ({ type: 'card/resetOnboardingState' }),
  setPendingMoneyAccountCardLink: (payload: unknown) => ({
    type: 'card/setPendingMoneyAccountCardLink',
    payload,
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      error: { default: 'red' },
      primary: { default: 'blue' },
    },
  }),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: (properties: Record<string, unknown>) => ({
        build: () => properties,
      }),
    }),
  }),
}));

const rejected = {
  type: 'rejected' as const,
  canRetry: false,
  reasons: ['INELIGIBLE'],
};

const renderOutcome = () =>
  renderHook(() => useImmersveKycOutcome(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ToastContext.Provider
        value={{ toastRef: { current: { showToast: mockShowToast } } } as never}
      >
        {children}
      </ToastContext.Provider>
    ),
  });

describe('useImmersveKycOutcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
  });

  it('toasts a retryable rejection without signing out', async () => {
    const { result } = renderOutcome();

    await act(async () => {
      await result.current.notifyKycRejected(
        {
          type: 'rejected',
          canRetry: true,
          retryUrl: 'https://verify.immersve.com/retry',
          reasons: ['ID_DOCUMENT_EXPIRED'],
        },
        { source: 'processing' },
      );
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          { label: 'card.card_onboarding.kyc_rejected.retry_title' },
        ],
        descriptionOptions: {
          description: 'card.card_onboarding.kyc_rejected.reasons.id_document',
        },
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: CardActions.KYC_REJECTED,
        can_retry: true,
        reason_codes: 'ID_DOCUMENT_EXPIRED',
        source: 'processing',
        provider: 'immersve',
      }),
    );
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('signs out and toasts when the rejection cannot be retried', async () => {
    const { result } = renderOutcome();

    await act(async () => {
      await result.current.notifyKycRejected(rejected, { source: 'reconcile' });
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'card.card_onboarding.kyc_failed.title' }],
        descriptionOptions: {
          description: 'card.card_onboarding.kyc_rejected.reasons.ineligible',
        },
      }),
    );
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockRemoveQueries).toHaveBeenCalledWith({ queryKey: ['card'] });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'card/resetOnboardingState',
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'card/setPendingMoneyAccountCardLink',
      payload: null,
    });
  });

  it('signs out without a toast when the failed screen is already showing the reason', async () => {
    const { result } = renderOutcome();

    await act(async () => {
      await result.current.notifyKycRejected(rejected, {
        source: 'kyc_failed',
        toast: false,
      });
    });

    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('toasts a permanent rejection only once while logout is still running', async () => {
    let finishLogout: () => void = () => undefined;
    mockLogout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishLogout = resolve;
        }),
    );
    const { result } = renderOutcome();

    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.notifyKycRejected(rejected, {
        source: 'processing',
      });
      second = result.current.notifyKycRejected(rejected, {
        source: 'reconcile',
      });
    });

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishLogout();
      await Promise.all([first, second]);
    });
  });

  it('toasts that identity review is still in progress', () => {
    const { result } = renderOutcome();

    act(() => {
      result.current.notifyKycInReview();
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'money.metamask_card.setup.reviewing_title' }],
        descriptionOptions: {
          description: 'money.metamask_card.setup.reviewing_description',
        },
      }),
    );
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('still clears the session when logout fails', async () => {
    mockLogout.mockRejectedValue(new Error('offline'));
    const { result } = renderOutcome();

    await act(async () => {
      await result.current.notifyKycRejected(rejected, { source: 'reconcile' });
    });

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/resetOnboardingState',
      });
    });
  });
});
