import { AppState, type AppStateStatus } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { flushPromises } from '../../../../util/test/utils';
import {
  clearPostUnlockResume,
  setPostUnlockResume,
} from '../../../../core/PostUnlockResume';
import { getVbaOnboardingResumeState } from '../../Ramp/Views/VirtualBankAccount/routes';
import {
  VBA_KYC_RESUME_MAX_AGE_MS,
  VBA_KYC_RESUME_OWNER,
  useLaunchSumSub,
} from './useLaunchSumSub';

const mockGetGeoCountry = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    KycController: {
      fetchSessionDisclaimers: jest.fn(),
      recordSessionDisclaimers: jest.fn(),
      launchProviderFlow: jest.fn(),
    },
    KycService: {
      getGeoCountry: () => mockGetGeoCountry(),
    },
  },
}));

jest.mock('../../../../core/PostUnlockResume', () => ({
  setPostUnlockResume: jest.fn(),
  clearPostUnlockResume: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockKycController = jest.mocked(Engine.context.KycController);
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
    mockGetGeoCountry.mockResolvedValue('US');
    mockKycController.fetchSessionDisclaimers.mockResolvedValue({
      kycProvider: [],
      idOS: [],
    } as unknown as Awaited<
      ReturnType<typeof mockKycController.fetchSessionDisclaimers>
    >);
    mockKycController.recordSessionDisclaimers.mockResolvedValue(
      undefined as never,
    );
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
    jest.restoreAllMocks();
  });

  const renderLaunch = () =>
    renderHook(() => useLaunchSumSub(onSubmitted, onAbandoned));

  it('requests a post-unlock resume before the provider opens and clears it before reporting the outcome', async () => {
    let finishProvider: (outcome: string) => void = () => undefined;
    mockKycController.launchProviderFlow.mockReturnValue(
      new Promise((resolve) => {
        finishProvider = resolve as (outcome: string) => void;
      }) as ReturnType<typeof mockKycController.launchProviderFlow>,
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
      new Promise(() => undefined) as ReturnType<
        typeof mockKycController.launchProviderFlow
      >,
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
