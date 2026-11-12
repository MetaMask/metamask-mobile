import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../../constants/navigation/Routes';
import { CardProviderIds } from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { BAANX_MAX_LIMIT } from '../../../constants';
import { CardActions, CardEntryPoint } from '../../../util/metrics';
import { useImmersveCardProvisioning } from './useImmersveCardProvisioning';
import { useImmersveEnableCard } from './useImmersveEnableCard';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useImmersveCardProvisioning', () => ({
  useImmersveCardProvisioning: jest.fn(),
}));

const mockConfirmLinkInBackground = jest.fn().mockResolvedValue(true);
jest.mock('../../../hooks/useMoneyAccountCardLinkage', () => ({
  useMoneyAccountCardLinkage: () => ({
    confirmLinkInBackground: mockConfirmLinkInBackground,
  }),
}));

const mockApproveFunding = jest.fn().mockResolvedValue(true);
let mockIsApproving = false;
jest.mock('../../../hooks/useImmersveMoneyAccountFundingApproval', () => ({
  useImmersveMoneyAccountFundingApproval: () => ({
    approveFunding: mockApproveFunding,
    isApproving: mockIsApproving,
  }),
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
    mockIsApproving = false;
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
      markCardFlowOpened: jest.fn(),
    });
  });

  it('enables the card when pendingAction is actionable', () => {
    mockUseImmersveCardProvisioning.mockReturnValue({
      isProvisioning: true,
      isReconciling: false,
      pendingAction: { type: 'funding', write: {} as never },
      resumePendingAction: mockResumePendingAction,
      markCardFlowOpened: jest.fn(),
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      } as never),
    );

    expect(result.current.canEnableCard).toBe(true);
    expect(result.current.provisioningView).toBe('hidden');
    expect(result.current.setupStep).toBe('funding');
    expect(result.current.isKycUnderReview).toBe(false);

    act(() => {
      result.current.enableCard();
    });
    expect(mockResumePendingAction).toHaveBeenCalledTimes(1);
    expect(mockApproveFunding).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('approves Money account funding in the background instead of resuming', () => {
    mockUseSelector.mockImplementation((selector) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const selectors = require('../../../../../../selectors/cardController');
      if (selector === selectors.selectCardActiveProviderId) {
        return CardProviderIds.Immersve;
      }
      if (selector === selectors.selectCardSelectedCountry) {
        return 'NZ';
      }
      if (selector === selectors.selectImmersveMoneyAccountMode) {
        return true;
      }
      return undefined;
    });
    mockUseImmersveCardProvisioning.mockReturnValue({
      isProvisioning: true,
      isReconciling: false,
      pendingAction: { type: 'funding', write: {} as never },
      resumePendingAction: mockResumePendingAction,
      markCardFlowOpened: jest.fn(),
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      } as never),
    );

    act(() => {
      result.current.enableCard();
    });

    expect(mockApproveFunding).toHaveBeenCalledWith(
      CardEntryPoint.CARD_HOME_MONEY_ACCOUNT_CARD,
    );
    expect(mockResumePendingAction).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        action: CardActions.IMMERSVE_PROVISIONING_RESUME,
        next_action: 'funding',
      }),
    );
  });

  it('does not start a Money account approval while setup is being rechecked', () => {
    mockUseSelector.mockImplementation((selector) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const selectors = require('../../../../../../selectors/cardController');
      if (selector === selectors.selectCardActiveProviderId) {
        return CardProviderIds.Immersve;
      }
      if (selector === selectors.selectImmersveMoneyAccountMode) {
        return true;
      }
      return undefined;
    });
    mockUseImmersveCardProvisioning.mockReturnValue({
      isProvisioning: true,
      isReconciling: true,
      pendingAction: { type: 'funding', write: {} as never },
      resumePendingAction: mockResumePendingAction,
      markCardFlowOpened: jest.fn(),
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      } as never),
    );

    act(() => {
      result.current.enableCard();
    });

    expect(mockApproveFunding).not.toHaveBeenCalled();
    expect(mockResumePendingAction).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('uses the Money home entrypoint when approval starts outside Card', () => {
    mockUseSelector.mockImplementation((selector) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const selectors = require('../../../../../../selectors/cardController');
      if (selector === selectors.selectCardActiveProviderId) {
        return CardProviderIds.Immersve;
      }
      if (selector === selectors.selectImmersveMoneyAccountMode) {
        return true;
      }
      return undefined;
    });
    mockUseImmersveCardProvisioning.mockReturnValue({
      isProvisioning: true,
      isReconciling: false,
      pendingAction: { type: 'funding', write: {} as never },
      resumePendingAction: mockResumePendingAction,
      markCardFlowOpened: jest.fn(),
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard(
        {
          alerts: [{ type: 'card_provisioning', dismissable: false }],
        } as never,
        { navigateFromOutsideCard: true },
      ),
    );

    act(() => {
      result.current.enableCard();
    });

    expect(mockApproveFunding).toHaveBeenCalledWith(
      CardEntryPoint.MONEY_HOME_METAMASK_CARD,
    );
    expect(mockResumePendingAction).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        action: CardActions.IMMERSVE_PROVISIONING_RESUME,
        next_action: 'funding',
      }),
    );
  });

  it('disables Enable card while a Money account approval is in progress', () => {
    mockIsApproving = true;
    mockUseSelector.mockImplementation((selector) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const selectors = require('../../../../../../selectors/cardController');
      if (selector === selectors.selectCardActiveProviderId) {
        return CardProviderIds.Immersve;
      }
      if (selector === selectors.selectImmersveMoneyAccountMode) {
        return true;
      }
      return undefined;
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'allowance_revoked', dismissable: false }],
      } as never),
    );

    expect(result.current.isEnableCardPending).toBe(true);
  });

  it('keeps Enable card disabled after approval until the funding step clears', () => {
    mockUseSelector.mockImplementation((selector) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const selectors = require('../../../../../../selectors/cardController');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const cardSlice = require('../../../../../../core/redux/slices/card');
      if (selector === selectors.selectCardActiveProviderId) {
        return CardProviderIds.Immersve;
      }
      if (selector === selectors.selectImmersveMoneyAccountMode) {
        return true;
      }
      if (selector === cardSlice.selectImmersveFundingSettling) {
        return true;
      }
      return undefined;
    });
    mockUseImmersveCardProvisioning.mockReturnValue({
      isProvisioning: true,
      isReconciling: false,
      pendingAction: { type: 'funding', write: {} as never },
      resumePendingAction: mockResumePendingAction,
      markCardFlowOpened: jest.fn(),
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      } as never),
    );

    expect(result.current.isEnableCardPending).toBe(true);
  });

  it('does not disable Enable card for a USDC on Base approval', () => {
    mockIsApproving = true;

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      } as never),
    );

    expect(result.current.isEnableCardPending).toBe(false);
  });

  it('does not enable the card when KYC is under review', () => {
    mockUseImmersveCardProvisioning.mockReturnValue({
      isProvisioning: true,
      isReconciling: false,
      pendingAction: { type: 'pending' },
      resumePendingAction: mockResumePendingAction,
      markCardFlowOpened: jest.fn(),
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      } as never),
    );

    expect(result.current.canEnableCard).toBe(false);
    expect(result.current.isKycUnderReview).toBe(true);
    expect(result.current.provisioningView).toBe('kyc_under_review');
    expect(result.current.setupStep).toBeNull();
  });

  it('passes the poll interval through to provisioning', () => {
    const data = {
      alerts: [{ type: 'card_provisioning', dismissable: false }],
    } as never;

    renderHook(() => useImmersveEnableCard(data, { pollIntervalMs: null }));

    expect(mockUseImmersveCardProvisioning).toHaveBeenCalledWith(data, {
      pollIntervalMs: null,
    });
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

  it('re-links the Money account in the background instead of opening reapprove', () => {
    mockUseSelector.mockImplementation((selector) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const selectors = require('../../../../../../selectors/cardController');
      if (selector === selectors.selectCardActiveProviderId) {
        return CardProviderIds.Immersve;
      }
      if (selector === selectors.selectCardSelectedCountry) {
        return 'NZ';
      }
      if (selector === selectors.selectImmersveMoneyAccountMode) {
        return true;
      }
      return undefined;
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'allowance_revoked', dismissable: false }],
      } as never),
    );

    act(() => {
      result.current.enableCard();
    });

    expect(mockConfirmLinkInBackground).toHaveBeenCalledWith({
      delegationAmountHuman: BAANX_MAX_LIMIT,
      entrypoint: CardEntryPoint.CARD_HOME_MONEY_ACCOUNT_CARD,
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('swallows a failed Money account re-link and stays on Card Home', async () => {
    mockConfirmLinkInBackground.mockRejectedValueOnce(new Error('link failed'));
    mockUseSelector.mockImplementation((selector) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const selectors = require('../../../../../../selectors/cardController');
      if (selector === selectors.selectCardActiveProviderId) {
        return CardProviderIds.Immersve;
      }
      if (selector === selectors.selectCardSelectedCountry) {
        return 'NZ';
      }
      if (selector === selectors.selectImmersveMoneyAccountMode) {
        return true;
      }
      return undefined;
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'allowance_revoked', dismissable: false }],
      } as never),
    );

    await act(async () => {
      result.current.enableCard();
    });

    expect(mockConfirmLinkInBackground).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
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
      markCardFlowOpened: jest.fn(),
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
      markCardFlowOpened: jest.fn(),
    });

    const { result } = renderHook(() =>
      useImmersveEnableCard({
        alerts: [{ type: 'card_provisioning', dismissable: false }],
      } as never),
    );

    expect(result.current.provisioningView).toBe('provisioning');
    expect(result.current.canEnableCard).toBe(false);
  });
});
