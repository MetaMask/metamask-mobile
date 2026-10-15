import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../core/Engine';
import {
  CardProviderError,
  CardProviderErrorCode,
  CardProviderIds,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { CardActions } from '../../../util/metrics';
import { useImmersveCardProvisioning } from './useImmersveCardProvisioning';
import { useImmersveEnableCard } from './useImmersveEnableCard';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: () => jest.fn(),
}));

jest.mock('./useImmersveCardProvisioning', () => ({
  useImmersveCardProvisioning: jest.fn(),
}));

const mockBuild = jest.fn(() => ({ build: 'event' }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));
const mockTrackEvent = jest.fn();
jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockLoadImmersveNextAction = jest.fn();
jest.mock('../../../util/loadImmersveNextAction', () => ({
  loadImmersveNextAction: (...args: unknown[]) =>
    mockLoadImmersveNextAction(...args),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    CardController: {
      createCard: jest.fn().mockResolvedValue({ cardId: 'card-2' }),
      fetchCardHomeData: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

const mockNavigate = jest.fn();
const mockResumePendingAction = jest.fn();

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseImmersveCardProvisioning =
  useImmersveCardProvisioning as jest.MockedFunction<
    typeof useImmersveCardProvisioning
  >;

describe('useImmersveEnableCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    mockUseSelector.mockImplementation((selector) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const selectors = require('../../../../../../selectors/cardController');
      if (selector === selectors.selectCardActiveProviderId) {
        return CardProviderIds.Immersve;
      }
      if (selector === selectors.selectCardSelectedCountry) {
        return 'GB';
      }
      return undefined;
    });
    mockUseImmersveCardProvisioning.mockReturnValue({
      isProvisioning: false,
      isReconciling: false,
      pendingAction: null,
      resumePendingAction: mockResumePendingAction,
    });
  });

  it('enables the card when pendingAction is actionable', () => {
    mockUseImmersveCardProvisioning.mockReturnValue({
      isProvisioning: true,
      isReconciling: false,
      pendingAction: { type: 'funding', write: {} as never },
      resumePendingAction: mockResumePendingAction,
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      } as never),
    );

    expect(result.current.canEnableCard).toBe(true);
    expect(result.current.provisioningView).toBe('hidden');
    expect(result.current.isKycUnderReview).toBe(false);

    act(() => {
      result.current.enableCard();
    });
    expect(mockResumePendingAction).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not enable the card when KYC is under review', () => {
    mockUseImmersveCardProvisioning.mockReturnValue({
      isProvisioning: true,
      isReconciling: false,
      pendingAction: { type: 'pending' },
      resumePendingAction: mockResumePendingAction,
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      } as never),
    );

    expect(result.current.canEnableCard).toBe(false);
    expect(result.current.isKycUnderReview).toBe(true);
    expect(result.current.provisioningView).toBe('kyc_under_review');
  });

  it('enables the card for allowance_revoked and navigates to reapprove mode', () => {
    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'allowance_revoked', dismissable: false }],
        primaryFundingAsset: { walletAddress: '0xFunding' },
      } as never),
    );

    expect(result.current.canEnableCard).toBe(true);

    act(() => {
      result.current.enableCard();
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        action: CardActions.SET_SPENDING_ALLOWANCE_BUTTON,
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ONBOARDING.ROOT, {
      screen: Routes.CARD.ONBOARDING.FUNDING_APPROVAL,
      params: {
        mode: 'reapprove',
        countryKey: 'GB',
        fundingAddress: '0xFunding',
      },
    });
    expect(mockResumePendingAction).not.toHaveBeenCalled();
  });

  it('never enables the card for a non-Immersve provider', () => {
    mockUseSelector.mockImplementation((selector) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const selectors = require('../../../../../../selectors/cardController');
      if (selector === selectors.selectCardActiveProviderId) {
        return CardProviderIds.Baanx;
      }
      if (selector === selectors.selectCardSelectedCountry) {
        return 'US';
      }
      return undefined;
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'allowance_revoked', dismissable: false }],
      } as never),
    );

    expect(result.current.canEnableCard).toBe(false);
  });

  it('returns reconciling provisioningView while reconcile is in flight', () => {
    mockUseImmersveCardProvisioning.mockReturnValue({
      isProvisioning: true,
      isReconciling: true,
      pendingAction: null,
      resumePendingAction: mockResumePendingAction,
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      } as never),
    );

    expect(result.current.provisioningView).toBe('reconciling');
    expect(result.current.canEnableCard).toBe(false);
  });

  it('returns provisioning view when the card is being created', () => {
    mockUseImmersveCardProvisioning.mockReturnValue({
      isProvisioning: true,
      isReconciling: false,
      pendingAction: null,
      resumePendingAction: mockResumePendingAction,
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      } as never),
    );

    expect(result.current.provisioningView).toBe('provisioning');
    expect(result.current.canEnableCard).toBe(false);
  });

  describe('cancelled card', () => {
    const cancelledData = {
      actions: [{ type: 'enable_card', reason: 'card_cancelled' }],
      alerts: [],
    } as never;

    it('shows Enable card without a cancelled banner', () => {
      const { result } = renderHook(() => useImmersveEnableCard(cancelledData));

      expect(result.current.canEnableCard).toBe(true);
      expect(result.current.provisioningView).toBe('hidden');
    });

    it('creates a replacement when spending prerequisites are active', async () => {
      mockLoadImmersveNextAction.mockResolvedValue({
        fundingSourceId: 'fs-1',
        action: { type: 'active' },
      });
      const { result } = renderHook(() => useImmersveEnableCard(cancelledData));

      await act(async () => {
        await result.current.enableCard();
      });

      expect(Engine.context.CardController.createCard).toHaveBeenCalledWith(
        'fs-1',
      );
      expect(
        Engine.context.CardController.fetchCardHomeData,
      ).toHaveBeenCalledWith({ force: true });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('resumes onboarding when a prerequisite is still required', async () => {
      mockLoadImmersveNextAction.mockResolvedValue({
        fundingSourceId: 'fs-1',
        action: { type: 'contact', needsEmail: true, needsPhone: false },
      });
      const { result } = renderHook(() => useImmersveEnableCard(cancelledData));

      await act(async () => {
        await result.current.enableCard();
      });

      expect(Engine.context.CardController.createCard).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.ROOT,
        expect.objectContaining({
          screen: Routes.CARD.ONBOARDING.SIGN_UP,
        }),
      );
    });

    it('does not refresh home data when the issuer rejects another card', async () => {
      mockLoadImmersveNextAction.mockResolvedValue({
        fundingSourceId: 'fs-1',
        action: { type: 'active' },
      });
      (
        Engine.context.CardController.createCard as jest.Mock
      ).mockRejectedValueOnce(
        new CardProviderError(
          CardProviderErrorCode.Forbidden,
          'max cards',
          403,
          'MAX_CARDS_EXCEEDED',
        ),
      );
      const { result } = renderHook(() => useImmersveEnableCard(cancelledData));

      await act(async () => {
        await result.current.enableCard();
      });

      expect(
        Engine.context.CardController.fetchCardHomeData,
      ).not.toHaveBeenCalled();
    });
  });
});
