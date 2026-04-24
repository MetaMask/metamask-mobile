import { renderHook } from '@testing-library/react-hooks';
import { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useOndoOutcomeToast } from './useOndoOutcomeToast';
import { dismissCampaignOutcomeToast } from '../../../../reducers/rewards';
import {
  selectCampaigns,
  selectDismissedCampaignOutcomeToasts,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useOndoCampaignParticipantOutcome } from './useOndoCampaignParticipantOutcome';
import {
  CampaignType,
  type OndoGmCampaignParticipantOutcomeDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';
import {
  ToastVariants,
  ButtonIconVariant,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';

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

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
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

jest.mock('./useOndoCampaignParticipantOutcome', () => ({
  useOndoCampaignParticipantOutcome: jest.fn(),
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
const mockUseOndoCampaignParticipantOutcome =
  useOndoCampaignParticipantOutcome as jest.MockedFunction<
    typeof useOndoCampaignParticipantOutcome
  >;
const mockDismissCampaignOutcomeToast =
  dismissCampaignOutcomeToast as jest.MockedFunction<
    typeof dismissCampaignOutcomeToast
  >;

const SUBSCRIPTION_ID = 'sub-123';
const CAMPAIGN_ID = 'campaign-456';
const CAMPAIGN_NAME = 'Ondo Test Campaign';

function makeParticipantOutcome(
  options: Pick<OndoGmCampaignParticipantOutcomeDto, 'outcomeStatus'> & {
    winnerVerificationCode?: string | null;
    subscriptionId?: string;
  },
): OndoGmCampaignParticipantOutcomeDto {
  return {
    subscriptionId: options.subscriptionId ?? SUBSCRIPTION_ID,
    outcomeStatus: options.outcomeStatus,
    winnerVerificationCode: options.winnerVerificationCode,
  };
}

const makeCompletedOndoCampaign = (
  id = CAMPAIGN_ID,
  endDate = '2025-01-01T00:00:00Z',
) => ({
  id,
  name: CAMPAIGN_NAME,
  type: CampaignType.ONDO_HOLDING,
  endDate,
  startDate: '2024-01-01T00:00:00Z',
});

function setupDefaults({
  campaigns = [],
  dismissed = {},
  subscriptionId = SUBSCRIPTION_ID,
  outcome = null,
}: {
  campaigns?: ReturnType<typeof makeCompletedOndoCampaign>[];
  dismissed?: Record<string, boolean>;
  subscriptionId?: string | null;
  outcome?: OndoGmCampaignParticipantOutcomeDto | null;
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectCampaigns) return campaigns;
    if (selector === selectDismissedCampaignOutcomeToasts) return dismissed;
    if (selector === selectRewardsSubscriptionId) return subscriptionId;
    return undefined;
  });
  mockUseOndoCampaignParticipantOutcome.mockReturnValue({
    outcome,
    isLoading: false,
    hasError: false,
  });
}

describe('useOndoOutcomeToast', () => {
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
  });

  describe('targetCampaign selection', () => {
    it('passes undefined to useOndoCampaignParticipantOutcome when no campaigns', () => {
      setupDefaults({ campaigns: [] });
      renderHook(() => useOndoOutcomeToast());
      expect(mockUseOndoCampaignParticipantOutcome).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('passes completed ONDO campaign id to useOndoCampaignParticipantOutcome', () => {
      const campaign = makeCompletedOndoCampaign();
      setupDefaults({ campaigns: [campaign] });
      renderHook(() => useOndoOutcomeToast());
      expect(mockUseOndoCampaignParticipantOutcome).toHaveBeenCalledWith(
        CAMPAIGN_ID,
      );
    });

    it('selects the most recently ended campaign when multiple exist', () => {
      const older = makeCompletedOndoCampaign(
        'campaign-old',
        '2024-06-01T00:00:00Z',
      );
      const newer = makeCompletedOndoCampaign(
        'campaign-new',
        '2025-01-01T00:00:00Z',
      );
      setupDefaults({ campaigns: [older, newer] });
      renderHook(() => useOndoOutcomeToast());
      expect(mockUseOndoCampaignParticipantOutcome).toHaveBeenCalledWith(
        'campaign-new',
      );
    });
  });

  describe('variant derivation', () => {
    it('does not show toast when outcome is null', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: null,
      });
      renderHook(() => useOndoOutcomeToast());
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('derives winner_verify when outcome has verification code and is not finalized', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'pending',
          winnerVerificationCode: 'WINNER-XYZ',
        }),
      });
      renderHook(() => useOndoOutcomeToast());
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ iconName: IconName.Star }),
      );
    });

    it('derives participant_no_winner when outcome is finalized with no verification code', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'finalized',
          winnerVerificationCode: null,
        }),
      });
      renderHook(() => useOndoOutcomeToast());
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ iconName: IconName.Info }),
      );
    });

    it('does not show toast when outcome is finalized with a verification code', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'finalized',
          winnerVerificationCode: 'WINNER-XYZ',
        }),
      });
      renderHook(() => useOndoOutcomeToast());
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('does not show toast when outcome is pending with no verification code', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'pending',
          winnerVerificationCode: null,
        }),
      });
      renderHook(() => useOndoOutcomeToast());
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('dismissal check', () => {
    it('does not show toast when winner_verify toast was previously dismissed', () => {
      const key = `${CAMPAIGN_ID}:${SUBSCRIPTION_ID}:winner_verify`;
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        }),
        dismissed: { [key]: true },
      });
      renderHook(() => useOndoOutcomeToast());
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('does not show toast when participant_no_winner toast was previously dismissed', () => {
      const key = `${CAMPAIGN_ID}:${SUBSCRIPTION_ID}:participant_no_winner`;
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'finalized',
          winnerVerificationCode: null,
        }),
        dismissed: { [key]: true },
      });
      renderHook(() => useOndoOutcomeToast());
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('shows toast when a different variant was dismissed', () => {
      const key = `${CAMPAIGN_ID}:${SUBSCRIPTION_ID}:participant_no_winner`;
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        }),
        dismissed: { [key]: true },
      });
      renderHook(() => useOndoOutcomeToast());
      expect(mockShowToast).toHaveBeenCalled();
    });
  });

  describe('toast configuration', () => {
    it('shows winner_verify toast with correct config', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        }),
      });
      renderHook(() => useOndoOutcomeToast());

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.Star,
          backgroundColor: 'transparent',
          hasNoTimeout: true,
          labelOptions: [
            {
              label: 'rewards.ondo_outcome_toast.winner_verify.title',
              isBold: true,
            },
          ],
          descriptionOptions: {
            description: `rewards.ondo_outcome_toast.winner_verify.description:${CAMPAIGN_NAME}`,
          },
          linkButtonOptions: expect.objectContaining({
            label: 'rewards.ondo_outcome_toast.winner_verify.cta',
          }),
          closeButtonOptions: expect.objectContaining({
            variant: ButtonIconVariant.Icon,
            iconName: IconName.Close,
          }),
        }),
      );
    });

    it('shows participant_no_winner toast with correct config', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'finalized',
          winnerVerificationCode: null,
        }),
      });
      renderHook(() => useOndoOutcomeToast());

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.Info,
          backgroundColor: 'transparent',
          hasNoTimeout: true,
          labelOptions: [
            {
              label: 'rewards.ondo_outcome_toast.participant_no_winner.title',
              isBold: true,
            },
          ],
          descriptionOptions: {
            description: `rewards.ondo_outcome_toast.participant_no_winner.description:${CAMPAIGN_NAME}`,
          },
          linkButtonOptions: expect.objectContaining({
            label: 'rewards.ondo_outcome_toast.participant_no_winner.cta',
          }),
        }),
      );
    });

    it('fires Success haptic for winner_verify', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        }),
      });
      renderHook(() => useOndoOutcomeToast());
      expect(notificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Success,
      );
    });

    it('fires Warning haptic for participant_no_winner', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'finalized',
          winnerVerificationCode: null,
        }),
      });
      renderHook(() => useOndoOutcomeToast());
      expect(notificationAsync).toHaveBeenCalledWith(
        NotificationFeedbackType.Warning,
      );
    });
  });

  describe('cleanup on blur', () => {
    it('calls closeToast in the cleanup function when screen blurs', () => {
      let cleanupFn: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((cb) => {
        const cleanup = cb();
        if (typeof cleanup === 'function') cleanupFn = cleanup;
      });

      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        }),
      });
      renderHook(() => useOndoOutcomeToast());

      expect(cleanupFn).toBeDefined();
      cleanupFn?.();
      expect(mockCloseToast).toHaveBeenCalledTimes(1);
    });

    it('does not return a cleanup function when variant is null', () => {
      let cleanupFn: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((cb) => {
        const result = cb();
        if (typeof result === 'function') cleanupFn = result;
      });

      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: null,
      });
      renderHook(() => useOndoOutcomeToast());

      expect(cleanupFn).toBeUndefined();
      expect(mockCloseToast).not.toHaveBeenCalled();
    });
  });

  describe('handleDismiss', () => {
    it('dispatches dismissCampaignOutcomeToast and closes toast when close button is pressed', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        }),
      });
      renderHook(() => useOndoOutcomeToast());

      const closeButtonOptions =
        mockShowToast.mock.calls[0][0].closeButtonOptions;
      closeButtonOptions.onPress();

      expect(mockDispatch).toHaveBeenCalledWith(
        mockDismissCampaignOutcomeToast.mock.results[0]?.value,
      );
      expect(mockDismissCampaignOutcomeToast).toHaveBeenCalledWith({
        campaignId: CAMPAIGN_ID,
        subscriptionId: SUBSCRIPTION_ID,
        variant: 'winner_verify',
      });
      expect(mockCloseToast).toHaveBeenCalled();
    });
  });

  describe('handleCta', () => {
    it('navigates to winning view and dismisses for winner_verify', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        }),
      });
      renderHook(() => useOndoOutcomeToast());

      const linkButtonOptions =
        mockShowToast.mock.calls[0][0].linkButtonOptions;
      linkButtonOptions.onPress();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW,
        { campaignId: CAMPAIGN_ID },
      );
      expect(mockDismissCampaignOutcomeToast).toHaveBeenCalledWith({
        campaignId: CAMPAIGN_ID,
        subscriptionId: SUBSCRIPTION_ID,
        variant: 'winner_verify',
      });
    });

    it('navigates to campaign details view and dismisses for participant_no_winner', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'finalized',
          winnerVerificationCode: null,
        }),
      });
      renderHook(() => useOndoOutcomeToast());

      const linkButtonOptions =
        mockShowToast.mock.calls[0][0].linkButtonOptions;
      linkButtonOptions.onPress();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
        { campaignId: CAMPAIGN_ID },
      );
      expect(mockDismissCampaignOutcomeToast).toHaveBeenCalledWith({
        campaignId: CAMPAIGN_ID,
        subscriptionId: SUBSCRIPTION_ID,
        variant: 'participant_no_winner',
      });
    });
  });

  describe('edge cases', () => {
    it('does not show toast when subscriptionId is missing', () => {
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        }),
        subscriptionId: null,
      });
      renderHook(() => useOndoOutcomeToast());
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('handles null toastRef gracefully', () => {
      (useContext as jest.Mock).mockReturnValue({ toastRef: null });
      setupDefaults({
        campaigns: [makeCompletedOndoCampaign()],
        outcome: makeParticipantOutcome({
          outcomeStatus: 'pending',
          winnerVerificationCode: 'CODE',
        }),
      });
      expect(() => renderHook(() => useOndoOutcomeToast())).not.toThrow();
    });
  });
});
