import { renderHook } from '@testing-library/react-hooks';
import { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { playNotification, NotificationMoment } from '../../../../util/haptics';
import { useCampaignOutcomeToast } from './useCampaignOutcomeToast';
import { dismissCampaignOutcomeToast } from '../../../../reducers/rewards';
import {
  selectCampaigns,
  selectDismissedCampaignOutcomeToasts,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  CampaignType,
  type BaseCampaignParticipantOutcomeDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
const ToastVariants = { Icon: 'Icon', App: 'App', Plain: 'Plain' };
const ButtonIconVariant = { Icon: 'Icon' };
const IconName = { Close: 'Close', Confirmation: 'Confirmation', Star: 'Star' };

jest.mock('../../../../component-library/components/Toast', () => ({
  ToastContext: { Consumer: jest.fn(), Provider: jest.fn() },
}));

jest.mock('../../../../component-library/components/Toast/Toast.types', () => ({
  ToastVariants: { Icon: 'Icon', App: 'App', Plain: 'Plain' },
  ButtonIconVariant: { Icon: 'Icon' },
}));

jest.mock('../../../../component-library/components/Icons/Icon', () => ({
  IconName: { Close: 'Close', Confirmation: 'Confirmation', Star: 'Star' },
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
  useCallback: jest.fn((fn) => fn),
  useMemo: jest.fn((fn) => fn()),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: jest.fn(),
}));

jest.mock('../../../../util/haptics', () => ({
  playNotification: jest.fn(),
  NotificationMoment: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    if (params?.campaignName) return `${key}:${params.campaignName}`;
    return key;
  }),
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return {
    ...actual,
    useAppThemeFromContext: () => actual.mockTheme,
  };
});

jest.mock('../../../../reducers/rewards', () => ({
  dismissCampaignOutcomeToast: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaigns: jest.fn(),
  selectDismissedCampaignOutcomeToasts: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../components/Campaigns/CampaignTile.utils', () => ({
  getCampaignStatus: jest.fn(() => 'complete'),
}));

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: mockCloseToast },
};

const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockDismissCampaignOutcomeToast =
  dismissCampaignOutcomeToast as jest.MockedFunction<
    typeof dismissCampaignOutcomeToast
  >;

const SUBSCRIPTION_ID = 'sub-123';
const CAMPAIGN_ID = 'campaign-456';
const CAMPAIGN_NAME = 'Test Campaign';

const mockUseOutcome = jest.fn();

const makeCompletedCampaign = (id = CAMPAIGN_ID, endDate = '2025-01-01') => ({
  id,
  name: CAMPAIGN_NAME,
  type: CampaignType.ONDO_HOLDING,
  endDate,
  startDate: '2024-01-01',
});

const WINNER_NAV = {
  route: 'WinnerRoute',
  params: { campaignId: CAMPAIGN_ID },
};
const NON_WINNER_NAV = {
  route: 'NonWinnerRoute',
  params: { campaignId: CAMPAIGN_ID },
};

const mockConfig = {
  campaignType: CampaignType.ONDO_HOLDING,
  useOutcome: mockUseOutcome,
  getWinnerNavigation: jest.fn(() => WINNER_NAV),
  getNonWinnerNavigation: jest.fn(() => NON_WINNER_NAV),
};

function setupDefaults({
  campaigns = [makeCompletedCampaign()],
  dismissed = {},
  subscriptionId = SUBSCRIPTION_ID,
  outcome = null,
}: {
  campaigns?: ReturnType<typeof makeCompletedCampaign>[] | undefined;
  dismissed?: Record<string, boolean>;
  subscriptionId?: string | null;
  outcome?: BaseCampaignParticipantOutcomeDto | null;
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectCampaigns) return campaigns ?? [];
    if (selector === selectDismissedCampaignOutcomeToasts) return dismissed;
    if (selector === selectRewardsSubscriptionId) return subscriptionId;
    return undefined;
  });
  mockUseOutcome.mockReturnValue({
    outcome,
    isLoading: false,
    hasError: false,
  });
}

describe('useCampaignOutcomeToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseNavigation.mockReturnValue({ navigate: mockNavigate } as never);
    (useContext as jest.Mock).mockReturnValue({ toastRef: mockToastRef });
    mockUseFocusEffect.mockImplementation((cb) => {
      cb();
    });
    mockDismissCampaignOutcomeToast.mockReturnValue({
      type: 'rewards/dismissCampaignOutcomeToast',
    } as never);
    mockConfig.getWinnerNavigation.mockReturnValue(WINNER_NAV);
    mockConfig.getNonWinnerNavigation.mockReturnValue(NON_WINNER_NAV);
  });

  describe('does not show toast when', () => {
    it('outcome is null', () => {
      setupDefaults({ outcome: null });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('no campaigns match the campaignType', () => {
      setupDefaults({ campaigns: [] });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('campaigns are missing from persisted state', () => {
      setupDefaults({ campaigns: undefined });
      expect(() =>
        renderHook(() => useCampaignOutcomeToast(mockConfig)),
      ).not.toThrow();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('subscriptionId is missing', () => {
      setupDefaults({
        subscriptionId: null,
        outcome: {
          subscriptionId: '',
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        },
      });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('winner toast was already dismissed', () => {
      const key = `${CAMPAIGN_ID}:${SUBSCRIPTION_ID}:winner`;
      setupDefaults({
        outcome: {
          subscriptionId: SUBSCRIPTION_ID,
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        },
        dismissed: { [key]: true },
      });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('non_winner toast was already dismissed', () => {
      const key = `${CAMPAIGN_ID}:${SUBSCRIPTION_ID}:non_winner`;
      setupDefaults({
        outcome: {
          subscriptionId: SUBSCRIPTION_ID,
          outcomeStatus: 'finalized',
          winnerVerificationCode: null,
        },
        dismissed: { [key]: true },
      });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('outcome is finalized with a verification code (neither variant)', () => {
      setupDefaults({
        outcome: {
          subscriptionId: SUBSCRIPTION_ID,
          outcomeStatus: 'finalized',
          winnerVerificationCode: 'CODE',
        },
      });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('winner toast', () => {
    const winnerOutcome: BaseCampaignParticipantOutcomeDto = {
      subscriptionId: SUBSCRIPTION_ID,
      outcomeStatus: 'pending',
      winnerVerificationCode: 'WINNER-XYZ',
    };

    it('shows Plain variant toast with trophy startAccessory', () => {
      setupDefaults({ outcome: winnerOutcome });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Plain,
          hasNoTimeout: true,
          startAccessory: expect.anything(),
        }),
      );
    });

    it('uses consolidated winner locale keys', () => {
      setupDefaults({ outcome: winnerOutcome });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            {
              label: 'rewards.campaign_outcome_toast.winner.title',
              isBold: true,
            },
          ],
          descriptionOptions: {
            description: `rewards.campaign_outcome_toast.winner.description:${CAMPAIGN_NAME}`,
          },
          linkButtonOptions: expect.objectContaining({
            label: 'rewards.campaign_outcome_toast.winner.cta',
          }),
        }),
      );
    });

    it('shows close button with correct config', () => {
      setupDefaults({ outcome: winnerOutcome });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          closeButtonOptions: expect.objectContaining({
            variant: ButtonIconVariant.Icon,
            iconName: IconName.Close,
          }),
        }),
      );
    });

    it('fires success haptic via playNotification', () => {
      setupDefaults({ outcome: winnerOutcome });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(playNotification).toHaveBeenCalledWith(NotificationMoment.Success);
    });
  });

  describe('non-winner toast', () => {
    const nonWinnerOutcome: BaseCampaignParticipantOutcomeDto = {
      subscriptionId: SUBSCRIPTION_ID,
      outcomeStatus: 'finalized',
      winnerVerificationCode: null,
    };

    it('shows Icon variant toast with Confirmation icon', () => {
      setupDefaults({ outcome: nonWinnerOutcome });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.Confirmation,
          backgroundColor: 'transparent',
          hasNoTimeout: true,
        }),
      );
    });

    it('uses consolidated non_winner locale keys', () => {
      setupDefaults({ outcome: nonWinnerOutcome });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            {
              label: 'rewards.campaign_outcome_toast.non_winner.title',
              isBold: true,
            },
          ],
          descriptionOptions: {
            description: `rewards.campaign_outcome_toast.non_winner.description:${CAMPAIGN_NAME}`,
          },
          linkButtonOptions: expect.objectContaining({
            label: 'rewards.campaign_outcome_toast.non_winner.cta',
          }),
        }),
      );
    });

    it('fires warning haptic via playNotification', () => {
      setupDefaults({ outcome: nonWinnerOutcome });
      renderHook(() => useCampaignOutcomeToast(mockConfig));
      expect(playNotification).toHaveBeenCalledWith(NotificationMoment.Warning);
    });
  });

  describe('handleDismiss', () => {
    it('dispatches dismissCampaignOutcomeToast with variant winner and closes toast', () => {
      setupDefaults({
        outcome: {
          subscriptionId: SUBSCRIPTION_ID,
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        },
      });
      renderHook(() => useCampaignOutcomeToast(mockConfig));

      const closeButtonOptions =
        mockShowToast.mock.calls[0][0].closeButtonOptions;
      closeButtonOptions.onPress();

      expect(mockDismissCampaignOutcomeToast).toHaveBeenCalledWith({
        campaignId: CAMPAIGN_ID,
        subscriptionId: SUBSCRIPTION_ID,
        variant: 'winner',
      });
      expect(mockCloseToast).toHaveBeenCalled();
    });

    it('dispatches dismissCampaignOutcomeToast with variant non_winner', () => {
      setupDefaults({
        outcome: {
          subscriptionId: SUBSCRIPTION_ID,
          outcomeStatus: 'finalized',
          winnerVerificationCode: null,
        },
      });
      renderHook(() => useCampaignOutcomeToast(mockConfig));

      const closeButtonOptions =
        mockShowToast.mock.calls[0][0].closeButtonOptions;
      closeButtonOptions.onPress();

      expect(mockDismissCampaignOutcomeToast).toHaveBeenCalledWith({
        campaignId: CAMPAIGN_ID,
        subscriptionId: SUBSCRIPTION_ID,
        variant: 'non_winner',
      });
    });
  });

  describe('handleCta', () => {
    it('navigates to winner route and dismisses for winner variant', () => {
      setupDefaults({
        outcome: {
          subscriptionId: SUBSCRIPTION_ID,
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        },
      });
      renderHook(() => useCampaignOutcomeToast(mockConfig));

      const { onPress } = mockShowToast.mock.calls[0][0].linkButtonOptions;
      onPress();

      expect(mockNavigate).toHaveBeenCalledWith(
        WINNER_NAV.route as never,
        WINNER_NAV.params as never,
      );
      expect(mockDismissCampaignOutcomeToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'winner' }),
      );
    });

    it('navigates to non-winner route and dismisses for non_winner variant', () => {
      setupDefaults({
        outcome: {
          subscriptionId: SUBSCRIPTION_ID,
          outcomeStatus: 'finalized',
          winnerVerificationCode: null,
        },
      });
      renderHook(() => useCampaignOutcomeToast(mockConfig));

      const { onPress } = mockShowToast.mock.calls[0][0].linkButtonOptions;
      onPress();

      expect(mockNavigate).toHaveBeenCalledWith(
        NON_WINNER_NAV.route as never,
        NON_WINNER_NAV.params as never,
      );
      expect(mockDismissCampaignOutcomeToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'non_winner' }),
      );
    });
  });

  describe('cleanup on blur', () => {
    it('calls closeToast in cleanup when screen blurs', () => {
      let cleanupFn: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((cb) => {
        const cleanup = cb();
        if (typeof cleanup === 'function') cleanupFn = cleanup;
      });

      setupDefaults({
        outcome: {
          subscriptionId: SUBSCRIPTION_ID,
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        },
      });
      renderHook(() => useCampaignOutcomeToast(mockConfig));

      expect(cleanupFn).toBeDefined();
      cleanupFn?.();
      expect(mockCloseToast).toHaveBeenCalled();
    });

    it('does not return cleanup when variant is null', () => {
      let cleanupFn: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((cb) => {
        const result = cb();
        if (typeof result === 'function') cleanupFn = result;
      });

      setupDefaults({ outcome: null });
      renderHook(() => useCampaignOutcomeToast(mockConfig));

      expect(cleanupFn).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles null toastRef gracefully', () => {
      (useContext as jest.Mock).mockReturnValue({ toastRef: null });
      setupDefaults({
        outcome: {
          subscriptionId: SUBSCRIPTION_ID,
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        },
      });
      expect(() =>
        renderHook(() => useCampaignOutcomeToast(mockConfig)),
      ).not.toThrow();
    });
  });
});
