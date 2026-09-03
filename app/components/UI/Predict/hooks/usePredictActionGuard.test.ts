import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import Routes from '../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import Engine from '../../../../core/Engine';
import { usePredictActionGuard } from './usePredictActionGuard';

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockUsePredictEligibility = jest.fn();
jest.mock('./usePredictEligibility', () => ({
  usePredictEligibility: () => mockUsePredictEligibility(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackGeoBlockTriggered: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: () => ({
    colors: {
      error: { default: 'error-default' },
      accent04: { normal: 'accent04-normal' },
    },
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockTrackGeoBlockTriggered = Engine.context.PredictController
  .trackGeoBlockTriggered as jest.Mock;

const mockShowToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: jest.fn(),
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    ToastContext.Provider,
    { value: { toastRef: mockToastRef } },
    children,
  );

const eligibleEligibility = {
  status: 'eligible' as const,
  isEligible: true,
  isIneligible: false,
  refreshEligibility: jest.fn(),
};

const ineligibleEligibility = {
  status: 'ineligible' as const,
  isEligible: false,
  isIneligible: true,
  refreshEligibility: jest.fn(),
};

const unavailableEligibility = {
  status: 'unavailable' as const,
  isEligible: false,
  isIneligible: false,
  refreshEligibility: jest.fn(),
};

const checkingEligibility = {
  status: 'checking' as const,
  isEligible: false,
  isIneligible: false,
  refreshEligibility: jest.fn(),
};

const getRetryHandler = () => {
  const toast = mockShowToast.mock.calls[0][0];
  return toast.linkButtonOptions.onPress as () => Promise<void>;
};

describe('usePredictActionGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eligibleEligibility.refreshEligibility = jest
      .fn()
      .mockResolvedValue({ status: 'eligible', country: 'US' });
    ineligibleEligibility.refreshEligibility = jest
      .fn()
      .mockResolvedValue({ status: 'ineligible', country: 'DE' });
    unavailableEligibility.refreshEligibility = jest
      .fn()
      .mockResolvedValue({ status: 'unavailable' });
    checkingEligibility.refreshEligibility = jest
      .fn()
      .mockResolvedValue({ status: 'checking' });
    mockUsePredictEligibility.mockReturnValue(eligibleEligibility);
  });

  describe('when user is eligible', () => {
    it('executes action without navigation', async () => {
      const { result } = renderHook(
        () => usePredictActionGuard({ navigation: mockNavigation }),
        { wrapper },
      );
      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction);
      });

      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('returns correct eligibility state', () => {
      const { result } = renderHook(
        () => usePredictActionGuard({ navigation: mockNavigation }),
        { wrapper },
      );

      expect(result.current.isEligible).toBe(true);
    });

    it('executes async action and returns promise', async () => {
      const { result } = renderHook(
        () => usePredictActionGuard({ navigation: mockNavigation }),
        { wrapper },
      );
      const mockAsyncAction = jest.fn().mockResolvedValue('success');

      await act(async () => {
        const promise = result.current.executeGuardedAction(mockAsyncAction);
        expect(promise).toBeInstanceOf(Promise);
        await promise;
      });

      expect(mockAsyncAction).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('when user is ineligible', () => {
    beforeEach(() => {
      mockUsePredictEligibility.mockReturnValue(ineligibleEligibility);
    });

    it('navigates to unavailable modal and does not execute action', async () => {
      const { result } = renderHook(
        () => usePredictActionGuard({ navigation: mockNavigation }),
        { wrapper },
      );
      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction);
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('tracks geo-block analytics when an attempted action is provided', async () => {
      const { result } = renderHook(
        () => usePredictActionGuard({ navigation: mockNavigation }),
        { wrapper },
      );

      await act(async () => {
        await result.current.executeGuardedAction(jest.fn(), {
          attemptedAction: 'buy',
        });
      });

      expect(mockTrackGeoBlockTriggered).toHaveBeenCalledWith({
        attemptedAction: 'buy',
      });
    });

    it('returns correct eligibility state', () => {
      const { result } = renderHook(
        () => usePredictActionGuard({ navigation: mockNavigation }),
        { wrapper },
      );

      expect(result.current.isEligible).toBe(false);
    });
  });

  describe('when eligibility is checking or unavailable', () => {
    it.each([
      ['checking', checkingEligibility],
      ['unavailable', unavailableEligibility],
    ])(
      'shows a connection toast and does not execute the action when %s',
      async (_status, eligibility) => {
        mockUsePredictEligibility.mockReturnValue(eligibility);

        const { result } = renderHook(
          () => usePredictActionGuard({ navigation: mockNavigation }),
          { wrapper },
        );
        const mockAction = jest.fn();

        await act(async () => {
          await result.current.executeGuardedAction(mockAction, {
            attemptedAction: 'buy',
          });
        });

        expect(mockAction).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockTrackGeoBlockTriggered).not.toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: ToastVariants.Icon,
            iconName: IconName.Error,
            linkButtonOptions: expect.objectContaining({
              label: 'predict.error.retry',
            }),
          }),
        );
      },
    );

    it('resumes the original action when retry returns eligible', async () => {
      unavailableEligibility.refreshEligibility.mockResolvedValue({
        status: 'eligible',
        country: 'US',
      });
      mockUsePredictEligibility.mockReturnValue(unavailableEligibility);

      const { result } = renderHook(
        () => usePredictActionGuard({ navigation: mockNavigation }),
        { wrapper },
      );
      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction, {
          attemptedAction: 'buy',
        });
      });

      await act(async () => {
        await getRetryHandler()();
      });

      expect(unavailableEligibility.refreshEligibility).toHaveBeenCalledTimes(
        1,
      );
      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockTrackGeoBlockTriggered).not.toHaveBeenCalled();
    });

    it('opens the regional sheet when retry returns ineligible', async () => {
      unavailableEligibility.refreshEligibility.mockResolvedValue({
        status: 'ineligible',
        country: 'DE',
      });
      mockUsePredictEligibility.mockReturnValue(unavailableEligibility);

      const { result } = renderHook(
        () => usePredictActionGuard({ navigation: mockNavigation }),
        { wrapper },
      );
      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction, {
          attemptedAction: 'buy',
        });
      });

      await act(async () => {
        await getRetryHandler()();
      });

      expect(mockAction).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      expect(mockTrackGeoBlockTriggered).toHaveBeenCalledWith({
        attemptedAction: 'buy',
      });
    });

    it('shows the connection toast again when retry stays unavailable', async () => {
      mockUsePredictEligibility.mockReturnValue(unavailableEligibility);

      const { result } = renderHook(
        () => usePredictActionGuard({ navigation: mockNavigation }),
        { wrapper },
      );
      const mockAction = jest.fn();

      await act(async () => {
        await result.current.executeGuardedAction(mockAction);
      });

      expect(mockShowToast).toHaveBeenCalledTimes(1);

      await act(async () => {
        await getRetryHandler()();
      });

      expect(unavailableEligibility.refreshEligibility).toHaveBeenCalledTimes(
        1,
      );
      expect(mockAction).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(2);
      expect(mockTrackGeoBlockTriggered).not.toHaveBeenCalled();
    });

    it('does not start a second retry while one is in flight', async () => {
      let resolveRefresh: ((value: { status: string }) => void) | undefined;
      unavailableEligibility.refreshEligibility.mockReturnValue(
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
      );
      mockUsePredictEligibility.mockReturnValue(unavailableEligibility);

      const { result } = renderHook(
        () => usePredictActionGuard({ navigation: mockNavigation }),
        { wrapper },
      );

      await act(async () => {
        await result.current.executeGuardedAction(jest.fn(), {
          attemptedAction: 'buy',
        });
      });

      const retry = getRetryHandler();

      const firstRetry = retry();
      const secondRetry = retry();

      await act(async () => {
        await Promise.all([firstRetry, secondRetry]);
      });

      expect(unavailableEligibility.refreshEligibility).toHaveBeenCalledTimes(
        1,
      );

      resolveRefresh?.({ status: 'unavailable' });
    });
  });

  describe('hook options', () => {
    it('works with navigation option', () => {
      const { result } = renderHook(
        () => usePredictActionGuard({ navigation: mockNavigation }),
        { wrapper },
      );

      expect(result.current.executeGuardedAction).toBeDefined();
      expect(typeof result.current.executeGuardedAction).toBe('function');
    });
  });
});
