import { AppState, type AppStateStatus } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import I18n from '../../../../../locales/i18n';
import { flushPromises } from '../../../../util/test/utils';
import {
  clearPostUnlockResume,
  setPostUnlockResume,
} from '../../../../core/PostUnlockResume';
import { getVbaOnboardingResumeState } from '../../Ramp/Views/VirtualBankAccount/routes';
import { trackKycVerificationUpdated } from '../utils/kycVerificationAnalytics';
import {
  VBA_KYC_RESUME_MAX_AGE_MS,
  VBA_KYC_RESUME_OWNER,
  useLaunchSumSub,
} from './useLaunchSumSub';

const originalLocale = I18n.locale;

jest.mock('../../../../core/Engine', () => ({
  context: {
    KycController: {
      fetchSessionDisclaimers: jest.fn(),
      recordSessionDisclaimers: jest.fn(),
      launchProviderFlow: jest.fn(),
    },
    KycService: { getGeoCountry: jest.fn() },
  },
}));

jest.mock('../../../../core/PostUnlockResume', () => ({
  setPostUnlockResume: jest.fn(),
  clearPostUnlockResume: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

jest.mock('../utils/kycVerificationAnalytics', () => ({
  trackKycVerificationUpdated: jest.fn(),
}));

const mockKycController = Engine.context.KycController as unknown as {
  fetchSessionDisclaimers: jest.Mock;
  recordSessionDisclaimers: jest.Mock;
  launchProviderFlow: jest.Mock;
};
const mockKycService = Engine.context.KycService as unknown as {
  getGeoCountry: jest.Mock;
};
const mockTrack = jest.mocked(trackKycVerificationUpdated);
const mockMark = jest.mocked(setPostUnlockResume);
const mockClear = jest.mocked(clearPostUnlockResume);
const mockRemoveAppStateListener = jest.fn();
let appStateChangeHandler: ((state: AppStateStatus) => void) | undefined;

describe('useLaunchSumSub', () => {
  const onSubmitted = jest.fn();
  const onAbandoned = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appStateChangeHandler = undefined;
    I18n.locale = 'pt';
    mockKycService.getGeoCountry.mockResolvedValue('BRA');
    mockKycController.fetchSessionDisclaimers.mockResolvedValue({
      idOS: [],
      kycProvider: [],
    });
    mockKycController.recordSessionDisclaimers.mockResolvedValue(undefined);
    mockMark.mockResolvedValue(undefined);
    mockClear.mockResolvedValue(undefined);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, handler) => {
        appStateChangeHandler = handler as (state: AppStateStatus) => void;
        return { remove: mockRemoveAppStateListener } as ReturnType<
          typeof AppState.addEventListener
        >;
      });
  });

  afterEach(() => {
    I18n.locale = originalLocale;
    jest.restoreAllMocks();
  });

  const renderLaunch = () =>
    renderHook(() => useLaunchSumSub(onSubmitted, onAbandoned));

  describe('post-unlock resume', () => {
    it('requests a post-unlock resume before the provider opens and clears it before reporting the outcome', async () => {
      let finishProvider: (outcome: string) => void = () => undefined;
      mockKycController.launchProviderFlow.mockReturnValue(
        new Promise((resolve) => {
          finishProvider = resolve as (outcome: string) => void;
        }),
      );

      renderLaunch();
      await act(flushPromises);

      expect(mockMark).toHaveBeenCalledTimes(1);
      expect(mockMark).toHaveBeenCalledWith({
        owner: VBA_KYC_RESUME_OWNER,
        state: getVbaOnboardingResumeState('vba-kyc-relaunch'),
        maxAgeMs: VBA_KYC_RESUME_MAX_AGE_MS,
      });
      expect(mockMark.mock.invocationCallOrder[0]).toBeLessThan(
        mockKycController.launchProviderFlow.mock.invocationCallOrder[0],
      );

      await act(async () => {
        finishProvider('submitted');
        await flushPromises();
      });

      expect(mockRemoveAppStateListener).toHaveBeenCalled();
      expect(mockClear).toHaveBeenCalledWith(VBA_KYC_RESUME_OWNER);
      expect(mockClear.mock.invocationCallOrder[0]).toBeLessThan(
        onSubmitted.mock.invocationCallOrder[0],
      );
      expect(onSubmitted).toHaveBeenCalledWith({ status: 'submitted' });
    });

    it('refreshes the request each time the app goes to the background while the provider is open', async () => {
      mockKycController.launchProviderFlow.mockReturnValue(
        new Promise(() => undefined),
      );

      renderLaunch();
      await act(flushPromises);
      appStateChangeHandler?.('inactive');
      appStateChangeHandler?.('background');
      appStateChangeHandler?.('active');
      appStateChangeHandler?.('background');

      expect(mockMark).toHaveBeenCalledTimes(3);
    });

    it('clears the request when the provider flow fails', async () => {
      mockKycController.launchProviderFlow.mockRejectedValue(
        new Error('sdk failed'),
      );

      const { result } = renderLaunch();
      await act(flushPromises);

      expect(mockClear).toHaveBeenCalledTimes(1);
      expect(result.current.hasError).toBe(true);
    });

    it('does not request a resume when recording consents fails', async () => {
      mockKycController.recordSessionDisclaimers.mockRejectedValue(
        new Error('consent failed'),
      );

      renderLaunch();
      await act(flushPromises);

      expect(mockMark).not.toHaveBeenCalled();
      expect(mockClear).not.toHaveBeenCalled();
      expect(mockKycController.launchProviderFlow).not.toHaveBeenCalled();
    });
  });

  describe('analytics', () => {
    it('tracks started right before the provider flow launches', async () => {
      mockKycController.launchProviderFlow.mockResolvedValue('submitted');

      renderLaunch();

      await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
      expect(mockKycController.launchProviderFlow).toHaveBeenCalledWith({
        locale: 'pt-BR',
      });
      expect(mockTrack).toHaveBeenCalledWith({ status: 'started' });
      expect(mockTrack.mock.invocationCallOrder[0]).toBeLessThan(
        mockKycController.launchProviderFlow.mock.invocationCallOrder[0],
      );
    });

    it('does not track started when consent recording fails before launch', async () => {
      mockKycService.getGeoCountry.mockRejectedValue(new Error('geo failed'));

      const { result } = renderLaunch();

      await waitFor(() => expect(result.current.hasError).toBe(true));
      expect(mockTrack).not.toHaveBeenCalled();
      expect(mockKycController.launchProviderFlow).not.toHaveBeenCalled();
    });

    it('tracks retry_started with the sumsub_error source and tracks started again on relaunch', async () => {
      mockKycController.launchProviderFlow.mockRejectedValueOnce(
        new Error('launch failed'),
      );
      mockKycController.launchProviderFlow.mockResolvedValueOnce('abandoned');

      const { result } = renderLaunch();
      await waitFor(() => expect(result.current.hasError).toBe(true));

      act(() => {
        result.current.retry();
      });

      await waitFor(() => expect(onAbandoned).toHaveBeenCalled());
      expect(mockTrack.mock.calls.map(([input]) => input)).toStrictEqual([
        { status: 'started' },
        { status: 'retry_started', retrySource: 'sumsub_error' },
        { status: 'started' },
      ]);
    });
  });
});
