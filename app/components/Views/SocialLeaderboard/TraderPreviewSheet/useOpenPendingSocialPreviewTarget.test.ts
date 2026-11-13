import { renderHook, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { openSharedPositionOnProfile } from '../../../../core/DeeplinkManager/handlers/legacy/socialPositionSheetDeeplink';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import {
  getPendingSocialPreviewTarget,
  setPendingSocialPreviewTarget,
} from './pendingSocialPreviewTarget';
import { useOpenPendingSocialPreviewTarget } from './useOpenPendingSocialPreviewTarget';

const mockShowToast = jest.fn();
const mockAddProperties = jest.fn();

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

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
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
  const mockCall = jest.mocked(Engine.controllerMessenger.call);

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
    expect(mockCall).not.toHaveBeenCalled();
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

  it('registers the accepted referral and confirms it with a toast', async () => {
    mockCall.mockResolvedValue(undefined as never);
    setPendingSocialPreviewTarget({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'onboarding',
      referralCode: 'code1234',
    });
    const { result } = renderHook(() => useOpenPendingSocialPreviewTarget());

    result.current(navigation);

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsMoneyController:registerReferee',
      { code: 'CODE1234' },
    );
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
  });

  it('still opens the profile and shows an error toast when the referral is refused', async () => {
    mockCall.mockRejectedValue(new Error('refused') as never);
    setPendingSocialPreviewTarget({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'onboarding',
      referralCode: 'CODE1234',
    });
    const { result } = renderHook(() => useOpenPendingSocialPreviewTarget());

    result.current(navigation);

    expect(navigateToSocialV1Profile).toHaveBeenCalled();
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            expect.objectContaining({
              label: strings(
                'social_leaderboard.trader_preview.referral_failed',
              ),
            }),
          ],
        }),
      ),
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ interaction_type: 'refused' }),
    );
  });
});
