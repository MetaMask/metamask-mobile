import { renderHook, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { openSharedPositionOnProfile } from '../../../../core/DeeplinkManager/handlers/legacy/socialPositionSheetDeeplink';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services';
import { releaseAnsweredReferralCode } from '../../../../reducers/rewardsMoney';
import type { RegisterMoneyRefereeResult } from '../../../UI/Rewards/hooks/useRegisterMoneyReferee';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import {
  getPendingSocialPreviewTarget,
  setPendingSocialPreviewTarget,
} from './pendingSocialPreviewTarget';
import { useOpenPendingSocialPreviewTarget } from './useOpenPendingSocialPreviewTarget';

const mockShowToast = jest.fn();
const mockAddProperties = jest.fn();
const mockDispatch = jest.fn();
const mockRegisterReferee = jest.fn<
  Promise<RegisterMoneyRefereeResult>,
  [string]
>();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../component-library/components/Toast', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual(
    '../../../../component-library/components/Toast',
  );
  return {
    ...actual,
    ToastContext: ReactActual.createContext({
      toastRef: {
        current: {
          showToast: (...args: unknown[]) => mockShowToast(...args),
        },
      },
    }),
  };
});

jest.mock('../../../UI/Rewards/hooks/useRegisterMoneyReferee', () => ({
  useRegisterMoneyReferee: () => mockRegisterReferee,
}));

jest.mock(
  '../../../../core/DeeplinkManager/handlers/legacy/socialPositionSheetDeeplink',
  () => ({ openSharedPositionOnProfile: jest.fn() }),
);

jest.mock('../navigation/navigateToSocialV1Profile', () => ({
  navigateToSocialV1Profile: jest.fn(),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: { error: { default: 'red' }, success: { default: 'green' } },
  }),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      addProperties: (properties: unknown) => {
        mockAddProperties(properties);
        return { build: () => properties };
      },
    }),
  }),
}));

describe('useOpenPendingSocialPreviewTarget', () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };

  const startOnboardingWithReferral = (referralCode = 'CODE1234') =>
    setPendingSocialPreviewTarget({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'onboarding',
      referralCode,
    });

  const expectFailureToast = (description: string) =>
    waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            expect.objectContaining({
              label: strings(
                'social_leaderboard.trader_preview.referral_failed',
              ),
            }),
          ],
          descriptionOptions: { description },
        }),
      ),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    setPendingSocialPreviewTarget(null);
  });

  it('returns false and leaves navigation alone without a link from the preview', () => {
    const { result } = renderHook(() => useOpenPendingSocialPreviewTarget());

    const opened = result.current(navigation);

    expect(opened).toBe(false);
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigateToSocialV1Profile).not.toHaveBeenCalled();
  });

  it('ignores a link that is still in preview', () => {
    setPendingSocialPreviewTarget({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'previewing',
    });
    const { result } = renderHook(() => useOpenPendingSocialPreviewTarget());

    const opened = result.current(navigation);

    expect(opened).toBe(false);
    expect(getPendingSocialPreviewTarget()?.stage).toBe('previewing');
  });

  it('leaves onboarding and opens the trader profile without following', () => {
    setPendingSocialPreviewTarget({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'onboarding',
    });
    const { result } = renderHook(() => useOpenPendingSocialPreviewTarget());

    const opened = result.current(navigation);

    expect(opened).toBe(true);
    expect(navigation.goBack).toHaveBeenCalled();
    expect(navigateToSocialV1Profile).toHaveBeenCalledWith(navigation, {
      traderId: 'trader-1',
      source: 'deep_link',
    });
    expect(mockRegisterReferee).not.toHaveBeenCalled();
    expect(getPendingSocialPreviewTarget()).toBeNull();
  });

  it('opens a shared position on its trader profile', () => {
    setPendingSocialPreviewTarget({
      kind: 'position',
      traderId: 'trader-1',
      positionId: 'position-1',
      stage: 'onboarding',
    });
    const { result } = renderHook(() => useOpenPendingSocialPreviewTarget());

    result.current(navigation);

    expect(openSharedPositionOnProfile).toHaveBeenCalledWith(
      'position-1',
      'trader-1',
    );
    expect(navigateToSocialV1Profile).not.toHaveBeenCalled();
  });

  it('registers the accepted referral through the shared core and confirms it with a toast', async () => {
    mockRegisterReferee.mockResolvedValue({ status: 'accepted' });
    startOnboardingWithReferral('code1234');
    const { result } = renderHook(() => useOpenPendingSocialPreviewTarget());

    result.current(navigation);

    expect(mockRegisterReferee).toHaveBeenCalledWith('code1234');
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            {
              label: strings(
                'social_leaderboard.trader_preview.referral_accepted',
              ),
            },
          ],
        }),
      ),
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ interaction_type: 'accepted' }),
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('still opens the profile, explains the failure and frees the code for a retry when registration fails', async () => {
    mockRegisterReferee.mockResolvedValue({
      status: 'refused',
      error: new Error('network'),
    });
    startOnboardingWithReferral();
    const { result } = renderHook(() => useOpenPendingSocialPreviewTarget());

    result.current(navigation);

    expect(navigateToSocialV1Profile).toHaveBeenCalled();
    await expectFailureToast(
      strings('rewards.error_messages.something_went_wrong'),
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_type: 'refused',
        refusal_reason: 'registration_failed',
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      releaseAnsweredReferralCode('CODE1234'),
    );
  });

  it('frees the code for a retry when rate limited', async () => {
    mockRegisterReferee.mockResolvedValue({
      status: 'refused',
      error: new RewardsMoneyHttpError('slow down', 429),
    });
    startOnboardingWithReferral();
    const { result } = renderHook(() => useOpenPendingSocialPreviewTarget());

    result.current(navigation);

    await expectFailureToast(strings('rewards.error_messages.rate_limited'));
    expect(mockDispatch).toHaveBeenCalledWith(
      releaseAnsweredReferralCode('CODE1234'),
    );
  });

  it('keeps the code answered when the refusal is final', async () => {
    mockRegisterReferee.mockResolvedValue({
      status: 'refused',
      error: new RewardsMoneyHttpError('conflict', 409),
    });
    startOnboardingWithReferral();
    const { result } = renderHook(() => useOpenPendingSocialPreviewTarget());

    result.current(navigation);

    await expectFailureToast(
      strings('rewards.error_messages.already_referred'),
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ refusal_reason: 'already_referred' }),
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('shows the validation message for an invalid code', async () => {
    mockRegisterReferee.mockResolvedValue({
      status: 'invalid',
      message: 'Invalid referral code',
    });
    startOnboardingWithReferral();
    const { result } = renderHook(() => useOpenPendingSocialPreviewTarget());

    result.current(navigation);

    await expectFailureToast('Invalid referral code');
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ refusal_reason: 'invalid_code' }),
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
