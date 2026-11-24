import { AppState } from 'react-native';
import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
  };
});
import { useImmersveCardProvisioning } from './useImmersveCardProvisioning';
import { CARD_SETUP_PENDING_POLL_MS } from './useCardSetupPendingRefresh';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import {
  CardProviderError,
  CardProviderErrorCode,
  type CardHomeData,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { CardActions } from '../../../util/metrics';

let mockProviderId: string | null = 'immersve';
let mockReduxFundingSourceId: string | null = 'fs-1';
let mockSelectedCountry: string | null = 'GB';
let mockFundingChannelId: string | undefined = 'base-channel';
let mockCountryFunding: Record<string, unknown> = {};
let mockPrimaryMoneyAccount: { address: string } | null = null;
let mockIsFocused = true;
let mockFundingSettling = false;
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector(undefined),
  useDispatch: () => mockDispatch,
}));
jest.mock('../../../../../../selectors/cardController', () => ({
  selectCardActiveProviderId: () => mockProviderId,
  selectCardSelectedCountry: () => mockSelectedCountry,
}));
jest.mock('../../../../../../selectors/featureFlagController/card', () => ({
  immersveFundingChannelForCountry: (
    countryFunding: Record<string, { source?: string }> | null | undefined,
    country: string | null | undefined,
  ) => {
    if (!country || !countryFunding) {
      return null;
    }
    return countryFunding[country.toUpperCase()] ?? null;
  },
  isMoneyAccountFundingChannel: (
    channel: { source?: string } | null | undefined,
  ) => channel?.source === 'moneyAccount',
  selectCardImmersveConfig: () => ({
    fundingChannelId: mockFundingChannelId,
  }),
  selectCardImmersveCountryFunding: () => mockCountryFunding,
}));
jest.mock('../../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: () => mockPrimaryMoneyAccount,
}));
jest.mock('../../../../../../util/Logger', () => ({
  error: jest.fn(),
}));
jest.mock('../../../../../../core/redux/slices/card', () => ({
  selectImmersveFundingSourceId: () => mockReduxFundingSourceId,
  selectImmersveFundingSettling: () => mockFundingSettling,
  setImmersveFundingSourceId: (id: string) => ({
    type: 'card/setImmersveFundingSourceId',
    payload: id,
  }),
  setImmersveFundingSettling: (settling: boolean) => ({
    type: 'card/setImmersveFundingSettling',
    payload: settling,
  }),
}));

const mockRoute = jest.fn();
jest.mock('../../../hooks/useImmersveOnboardingRouter', () => ({
  useImmersveOnboardingRouter: () => mockRoute,
}));

const mockNotifyKycRejected = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../hooks/useImmersveKycOutcome', () => ({
  useImmersveKycOutcome: () => ({
    notifyKycRejected: (...args: unknown[]) => mockNotifyKycRejected(...args),
    notifyKycInReview: jest.fn(),
  }),
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({});
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockResolve = jest.fn();
jest.mock('../../../util/immersveResume', () => ({
  resolveImmersveFundingSourceId: (args: unknown) => mockResolve(args),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    CardController: {
      fetchCardHomeData: jest.fn().mockResolvedValue(undefined),
      getSpendingPrerequisites: jest.fn(),
      createCard: jest.fn().mockResolvedValue({ cardId: 'card-1' }),
    },
  },
}));

const controller = Engine.context.CardController as unknown as {
  fetchCardHomeData: jest.Mock;
  getSpendingPrerequisites: jest.Mock;
  createCard: jest.Mock;
};

const provisioningData = {
  alerts: [{ type: 'card_provisioning', dismissable: false }],
} as CardHomeData;

const fundingPrerequisites = [
  {
    stage: 'funding',
    status: 'action-required',
    actionType: 'smart_contract_write',
    params: {
      abi: [],
      contractAddress: '0xusdc',
      method: 'approve',
      params: {},
    },
  },
];

const kycPrerequisites = [
  {
    stage: 'kyc',
    status: 'action-required',
    actionType: 'follow_kyc_url',
    params: { kycUrl: 'https://kyc' },
  },
];

describe('useImmersveCardProvisioning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AppState.addEventListener as jest.Mock).mockImplementation(() => ({
      remove: jest.fn(),
    }));
    mockProviderId = 'immersve';
    mockReduxFundingSourceId = 'fs-1';
    mockSelectedCountry = 'GB';
    mockFundingChannelId = 'base-channel';
    mockCountryFunding = {};
    mockPrimaryMoneyAccount = null;
    mockIsFocused = true;
    mockFundingSettling = false;
    mockResolve.mockImplementation(
      async ({ existingId }: { existingId?: string | null }) =>
        existingId ?? 'fs-resolved',
    );
    controller.getSpendingPrerequisites.mockResolvedValue({
      prerequisites: [],
    });
    controller.createCard.mockResolvedValue({ cardId: 'card-1' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('polling', () => {
    it('polls fetchCardHomeData while provisioning on Immersve after reconcile', async () => {
      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      expect(result.current.isProvisioning).toBe(true);
      await waitFor(() => expect(result.current.isReconciling).toBe(false));

      jest.useFakeTimers();
      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);
      controller.fetchCardHomeData.mockClear();
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(controller.fetchCardHomeData).toHaveBeenCalledTimes(2);
      expect(controller.fetchCardHomeData).toHaveBeenCalledWith({
        force: true,
      });
      jest.useRealTimers();
    });

    it('polls on the caller interval', async () => {
      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          pollIntervalMs: 15_000,
        }),
      );

      await waitFor(() => expect(result.current.isReconciling).toBe(false));

      jest.useFakeTimers();
      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);
      controller.fetchCardHomeData.mockClear();
      act(() => {
        jest.advanceTimersByTime(10_000);
      });
      expect(controller.fetchCardHomeData).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      expect(controller.fetchCardHomeData).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('does not poll when the interval is disabled', async () => {
      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, { pollIntervalMs: null }),
      );

      await waitFor(() => expect(result.current.isReconciling).toBe(false));
      jest.useFakeTimers();
      controller.fetchCardHomeData.mockClear();
      act(() => {
        jest.advanceTimersByTime(20_000);
      });
      expect(controller.fetchCardHomeData).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('does not poll for non-Immersve providers', () => {
      mockProviderId = 'baanx';
      jest.useFakeTimers();

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      expect(result.current.isProvisioning).toBe(false);
      jest.advanceTimersByTime(10000);
      expect(controller.fetchCardHomeData).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('does not poll when there is no provisioning alert', () => {
      jest.useFakeTimers();
      renderHook(() => useImmersveCardProvisioning({ alerts: [] } as never));

      jest.advanceTimersByTime(10000);
      expect(controller.fetchCardHomeData).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('does not reconcile or poll while Card Home is not focused', () => {
      mockIsFocused = false;
      jest.useFakeTimers();

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      jest.advanceTimersByTime(10000);
      expect(result.current.isReconciling).toBe(true);
      expect(mockResolve).not.toHaveBeenCalled();
      expect(controller.getSpendingPrerequisites).not.toHaveBeenCalled();
      expect(controller.fetchCardHomeData).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('reconciles once the screen is focused again, without a Card flow mark', async () => {
      mockIsFocused = false;
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: kycPrerequisites,
      });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          recheckOnFocus: true,
        }),
      );

      expect(mockResolve).not.toHaveBeenCalled();

      mockIsFocused = true;
      rerender(undefined);

      await waitFor(() =>
        expect(result.current.pendingAction?.type).toBe('kyc'),
      );
      expect(result.current.isReconciling).toBe(false);
      expect(mockResolve).toHaveBeenCalledTimes(1);
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
    });

    it('keeps Continue disabled while a reconcile deferred after a result runs', async () => {
      let resolveRecheck: (value: {
        prerequisites: typeof kycPrerequisites;
      }) => void = () => undefined;
      controller.getSpendingPrerequisites
        .mockResolvedValueOnce({ prerequisites: kycPrerequisites })
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveRecheck = resolve;
          }),
        );

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          recheckOnFocus: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.pendingAction?.type).toBe('kyc');
        expect(result.current.isReconciling).toBe(false);
      });

      mockIsFocused = false;
      mockSelectedCountry = 'NZ';
      rerender(undefined);
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);

      mockIsFocused = true;
      rerender(undefined);

      await waitFor(() =>
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2),
      );
      expect(result.current.isReconciling).toBe(true);
      act(() => {
        result.current.resumePendingAction();
      });
      expect(mockRoute).not.toHaveBeenCalled();

      await act(async () => {
        resolveRecheck({ prerequisites: kycPrerequisites });
      });

      await waitFor(() => expect(result.current.isReconciling).toBe(false));
    });

    it('does not poll while status is still reconciling', async () => {
      let resolvePrereqs!: (value: { prerequisites: never[] }) => void;
      controller.getSpendingPrerequisites.mockReturnValue(
        new Promise((resolve) => {
          resolvePrereqs = resolve;
        }),
      );

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      expect(result.current.isReconciling).toBe(true);
      jest.useFakeTimers();
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(controller.fetchCardHomeData).not.toHaveBeenCalled();
      jest.useRealTimers();

      await act(async () => {
        resolvePrereqs({ prerequisites: [] });
      });
    });
  });

  describe('reconcile', () => {
    it('keeps an in-flight reconcile running when the poll interval changes', async () => {
      let resolvePrereqs!: (value: { prerequisites: never[] }) => void;
      controller.getSpendingPrerequisites.mockReturnValue(
        new Promise((resolve) => {
          resolvePrereqs = resolve;
        }),
      );

      const { rerender } = renderHook(
        ({ pollIntervalMs }: { pollIntervalMs: number | null }) =>
          useImmersveCardProvisioning(provisioningData, { pollIntervalMs }),
        { initialProps: { pollIntervalMs: 5_000 as number | null } },
      );

      await waitFor(() =>
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1),
      );

      rerender({ pollIntervalMs: null });
      rerender({ pollIntervalMs: 15_000 });

      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolvePrereqs({ prerequisites: [] });
      });

      await waitFor(() =>
        expect(controller.createCard).toHaveBeenCalledTimes(1),
      );
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
    });

    it('resumes a createCard retry that failed while offline', async () => {
      let rejectCreateCard!: (error: Error) => void;
      controller.createCard.mockImplementationOnce(
        async () =>
          new Promise((_, reject) => {
            rejectCreateCard = reject;
          }),
      );

      const { rerender } = renderHook(
        ({ pollIntervalMs }: { pollIntervalMs: number | null }) =>
          useImmersveCardProvisioning(provisioningData, { pollIntervalMs }),
        { initialProps: { pollIntervalMs: null as number | null } },
      );

      await waitFor(() =>
        expect(controller.createCard).toHaveBeenCalledTimes(1),
      );

      await act(async () => {
        rejectCreateCard(new Error('offline'));
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(controller.createCard).toHaveBeenCalledTimes(1);

      rerender({ pollIntervalMs: 5_000 });

      await waitFor(() =>
        expect(controller.createCard).toHaveBeenCalledTimes(2),
      );
    });

    it('retries a settling recheck that was skipped while offline', async () => {
      mockFundingSettling = true;
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: fundingPrerequisites,
      });

      const { result, rerender } = renderHook(
        ({ pollIntervalMs }: { pollIntervalMs: number | null }) =>
          useImmersveCardProvisioning(provisioningData, { pollIntervalMs }),
        { initialProps: { pollIntervalMs: null as number | null } },
      );

      await waitFor(() => {
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
        expect(result.current.isReconciling).toBe(false);
      });

      rerender({ pollIntervalMs: 5_000 });

      await waitFor(() =>
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2),
      );
      expect(controller.createCard).not.toHaveBeenCalled();
    });

    it('starts reconciling and clears once status is resolved', async () => {
      let resolvePrereqs!: (value: {
        prerequisites: typeof kycPrerequisites;
      }) => void;
      controller.getSpendingPrerequisites.mockReturnValue(
        new Promise((resolve) => {
          resolvePrereqs = resolve;
        }),
      );

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      expect(result.current.isReconciling).toBe(true);
      expect(result.current.pendingAction).toBeNull();

      await act(async () => {
        resolvePrereqs({ prerequisites: kycPrerequisites });
      });

      await waitFor(() => {
        expect(result.current.isReconciling).toBe(false);
        expect(result.current.pendingAction).toEqual({
          type: 'kyc',
          url: 'https://kyc',
          ctaHint: undefined,
          reasons: [],
        });
      });
    });

    it('creates the card once when prerequisites are active', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [],
      });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      expect(result.current.isReconciling).toBe(true);
      await waitFor(() =>
        expect(controller.createCard).toHaveBeenCalledWith('fs-1'),
      );
      expect(result.current.isReconciling).toBe(false);
      expect(result.current.pendingAction).toBeNull();
      expect(mockRoute).not.toHaveBeenCalled();
    });

    it('exposes pendingAction for a mid-onboarding user without auto-routing', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: kycPrerequisites,
      });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'kyc',
          url: 'https://kyc',
          ctaHint: undefined,
          reasons: [],
        }),
      );
      expect(result.current.isReconciling).toBe(false);
      expect(mockRoute).not.toHaveBeenCalled();
      expect(controller.createCard).not.toHaveBeenCalled();
    });

    it('does not poll while there is a pending verification action', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: kycPrerequisites,
      });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() => expect(result.current.pendingAction).not.toBeNull());

      jest.useFakeTimers();
      controller.fetchCardHomeData.mockClear();
      jest.advanceTimersByTime(10000);
      expect(controller.fetchCardHomeData).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('resumePendingAction routes to the left-off step', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: kycPrerequisites,
      });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() => expect(result.current.pendingAction).not.toBeNull());

      act(() => {
        result.current.resumePendingAction();
      });

      expect(mockRoute).toHaveBeenCalledWith(
        { type: 'kyc', url: 'https://kyc', ctaHint: undefined, reasons: [] },
        { navigateFromRoot: true, countryKey: 'GB' },
      );
    });

    it('resumePendingAction enters through the Card root when asked', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: kycPrerequisites,
      });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          navigateFromOutsideCard: true,
        }),
      );

      await waitFor(() => expect(result.current.pendingAction).not.toBeNull());

      act(() => {
        result.current.resumePendingAction();
      });

      expect(mockRoute).toHaveBeenCalledWith(
        { type: 'kyc', url: 'https://kyc', ctaHint: undefined, reasons: [] },
        {
          navigateFromRoot: true,
          countryKey: 'GB',
          navigateFromOutsideCard: true,
        },
      );
    });

    it('resolves + persists the funding source when the Redux id is empty', async () => {
      mockReduxFundingSourceId = null;
      mockDispatch.mockImplementation(
        (action: { type?: string; payload?: string }) => {
          if (action?.type === 'card/setImmersveFundingSourceId') {
            mockReduxFundingSourceId = action.payload ?? null;
          }
        },
      );

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
      // Simulate Redux subscription updating the selector after dispatch.
      rerender(undefined);

      await waitFor(() => {
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledWith(
          'fs-resolved',
          expect.any(Object),
        );
        expect(result.current.isReconciling).toBe(false);
      });
      expect(mockResolve).toHaveBeenCalledWith({
        fundingChannelId: 'base-channel',
        existingId: null,
        moneyAccountAddress: undefined,
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/setImmersveFundingSourceId',
        payload: 'fs-resolved',
      });
    });

    it('replaces a stored wallet funding source when the channel is a Money account', async () => {
      mockReduxFundingSourceId = 'fs-base';
      mockSelectedCountry = 'NZ';
      mockPrimaryMoneyAccount = {
        address: '0x000000000000000000000000000000000000dead',
      };
      mockCountryFunding = {
        NZ: {
          source: 'moneyAccount',
          fundingChannelId: 'money-channel',
        },
      };

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      await waitFor(() => {
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledWith(
          'fs-resolved',
          expect.objectContaining({ kycRegion: 'NZ' }),
        );
      });
      expect(mockResolve).toHaveBeenCalledWith({
        fundingChannelId: 'money-channel',
        existingId: undefined,
        moneyAccountAddress: '0x000000000000000000000000000000000000dEaD',
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/setImmersveFundingSourceId',
        payload: 'fs-resolved',
      });
    });

    it('does not resolve a wallet source when the Money account address is missing', async () => {
      mockSelectedCountry = 'NZ';
      mockPrimaryMoneyAccount = null;
      mockCountryFunding = {
        NZ: {
          source: 'moneyAccount',
          fundingChannelId: 'money-channel',
        },
      };

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() => expect(result.current.isReconciling).toBe(false));
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'useImmersveCardProvisioning: Money account address is missing',
        }),
        expect.any(Object),
      );
      expect(mockResolve).not.toHaveBeenCalled();
      expect(controller.getSpendingPrerequisites).not.toHaveBeenCalled();
    });

    it('swallows a 409 Conflict on createCard', async () => {
      controller.createCard.mockRejectedValue(
        new CardProviderError(
          CardProviderErrorCode.Conflict,
          'Conflict on createCard',
          409,
        ),
      );

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      await waitFor(() =>
        expect(controller.createCard).toHaveBeenCalledTimes(1),
      );
    });

    it('emits BUTTON_CLICKED (not Funding COMPLETED) on Conflict before createCard', async () => {
      mockResolve.mockRejectedValue(
        new CardProviderError(
          CardProviderErrorCode.Conflict,
          'Conflict on reconcile',
          409,
        ),
      );

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      await waitFor(() => expect(mockTrackEvent).toHaveBeenCalled());

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_FUNDING_PROCESS_COMPLETED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'immersve',
          action: CardActions.IMMERSVE_ONBOARDING_ROUTED,
          step: 'provisioning_reconcile',
          status: 'completed',
          already_provisioned: true,
        }),
      );
      expect(controller.createCard).not.toHaveBeenCalled();
    });

    it('re-reads the left-off step when focus returns', async () => {
      controller.getSpendingPrerequisites
        .mockResolvedValueOnce({ prerequisites: kycPrerequisites })
        .mockResolvedValueOnce({
          prerequisites: [
            {
              stage: 'expected_spend',
              status: 'action-required',
              actionType: 'set_expected_spend_amount',
            },
          ],
        });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          recheckOnFocus: true,
        }),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'kyc',
          url: 'https://kyc',
          ctaHint: undefined,
          reasons: [],
        }),
      );

      act(() => {
        result.current.resumePendingAction();
      });
      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'expected_spend',
        }),
      );
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
    });

    it('ignores resume while a focus recheck is still in flight', async () => {
      // The in-flight window is hook state between two prerequisites calls.
      // The Money home skeleton only shows that a recheck started; it cannot
      // assert that the previous step is not routed.
      let resolveRecheck: (value: {
        prerequisites: {
          stage: string;
          status: string;
          actionType: string;
        }[];
      }) => void = () => undefined;
      const recheck = new Promise<{
        prerequisites: {
          stage: string;
          status: string;
          actionType: string;
        }[];
      }>((resolve) => {
        resolveRecheck = resolve;
      });
      controller.getSpendingPrerequisites
        .mockResolvedValueOnce({ prerequisites: kycPrerequisites })
        .mockReturnValueOnce(recheck);

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          recheckOnFocus: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.pendingAction).toEqual({
          type: 'kyc',
          url: 'https://kyc',
          ctaHint: undefined,
          reasons: [],
        });
        expect(result.current.isReconciling).toBe(false);
      });

      act(() => {
        result.current.markCardFlowOpened();
      });
      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);

      await waitFor(() => expect(result.current.isReconciling).toBe(true));

      act(() => {
        result.current.resumePendingAction();
      });

      expect(mockRoute).not.toHaveBeenCalled();

      await act(async () => {
        resolveRecheck({
          prerequisites: [
            {
              stage: 'expected_spend',
              status: 'action-required',
              actionType: 'set_expected_spend_amount',
            },
          ],
        });
      });

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'expected_spend',
        }),
      );
      expect(result.current.isReconciling).toBe(false);
    });

    it('does not re-read the left-off step on focus without the option', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: kycPrerequisites,
      });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'kyc',
          url: 'https://kyc',
          ctaHint: undefined,
          reasons: [],
        }),
      );

      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);

      await act(async () => {
        await Promise.resolve();
      });

      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
      expect(result.current.pendingAction).toEqual({
        type: 'kyc',
        url: 'https://kyc',
        ctaHint: undefined,
        reasons: [],
      });
    });

    it('does not re-read the left-off step when focus returns without opening a Card screen', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: kycPrerequisites,
      });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          recheckOnFocus: true,
        }),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'kyc',
          url: 'https://kyc',
          ctaHint: undefined,
          reasons: [],
        }),
      );

      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);

      await act(async () => {
        await Promise.resolve();
      });

      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
      expect(result.current.isReconciling).toBe(false);
      expect(result.current.pendingAction).toEqual({
        type: 'kyc',
        url: 'https://kyc',
        ctaHint: undefined,
        reasons: [],
      });
    });

    it('rechecks once for each Card screen that was opened', async () => {
      controller.getSpendingPrerequisites
        .mockResolvedValueOnce({ prerequisites: kycPrerequisites })
        .mockResolvedValue({
          prerequisites: [
            {
              stage: 'expected_spend',
              status: 'action-required',
              actionType: 'set_expected_spend_amount',
            },
          ],
        });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          recheckOnFocus: true,
        }),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'kyc',
          url: 'https://kyc',
          ctaHint: undefined,
          reasons: [],
        }),
      );

      act(() => {
        result.current.markCardFlowOpened();
      });
      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'expected_spend',
        }),
      );
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);

      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);

      await act(async () => {
        await Promise.resolve();
      });

      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
      expect(result.current.isReconciling).toBe(false);
    });

    it('retries a failed recheck while the approval is settling', async () => {
      jest.useFakeTimers();
      mockFundingSettling = true;
      controller.getSpendingPrerequisites
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValue({ prerequisites: [] });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
      expect(result.current.pendingAction).toBeNull();
      expect(controller.createCard).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
      expect(controller.createCard).toHaveBeenCalledWith('fs-1');
      jest.useRealTimers();
    });

    it('hides the funding action and rechecks while the approval is settling', async () => {
      jest.useFakeTimers();
      mockFundingSettling = true;
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: fundingPrerequisites,
      });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.isReconciling).toBe(false);
      expect(result.current.pendingAction).toBeNull();
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
      expect(result.current.pendingAction).toBeNull();
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: 'card/setImmersveFundingSettling',
        payload: false,
      });
      jest.useRealTimers();
    });

    it('drops a resolved funding action when settling starts and reconciles again', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: fundingPrerequisites,
      });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() =>
        expect(result.current.pendingAction?.type).toBe('funding'),
      );
      expect(result.current.isReconciling).toBe(false);

      mockFundingSettling = true;
      controller.getSpendingPrerequisites.mockClear();
      rerender(undefined);

      await waitFor(() => {
        expect(result.current.pendingAction).toBeNull();
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
      });
      // The skeleton stays down: settling is not a first load.
      expect(result.current.isReconciling).toBe(false);
    });

    it('creates the card and clears settling once prerequisites are active', async () => {
      mockFundingSettling = true;
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [],
      });

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      await waitFor(() =>
        expect(controller.createCard).toHaveBeenCalledWith('fs-1'),
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/setImmersveFundingSettling',
        payload: false,
      });
    });

    it('clears settling and shows any action other than funding', async () => {
      mockFundingSettling = true;
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: kycPrerequisites,
      });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'kyc',
          url: 'https://kyc',
          ctaHint: undefined,
          reasons: [],
        }),
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/setImmersveFundingSettling',
        payload: false,
      });
    });

    it('clears settling once the provisioning alert goes away', async () => {
      mockFundingSettling = true;
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: fundingPrerequisites,
      });

      const { result, rerender } = renderHook(
        ({ data }) => useImmersveCardProvisioning(data),
        { initialProps: { data: provisioningData } },
      );

      await waitFor(() => expect(result.current.isReconciling).toBe(false));
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: 'card/setImmersveFundingSettling',
        payload: false,
      });

      rerender({ data: { alerts: [] } as never });

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'card/setImmersveFundingSettling',
          payload: false,
        }),
      );
    });

    it('rechecks an identity review when focus returns', async () => {
      controller.getSpendingPrerequisites
        .mockResolvedValueOnce({
          prerequisites: [{ stage: 'kyc', status: 'pending' }],
        })
        .mockResolvedValueOnce({
          prerequisites: [
            {
              stage: 'expected_spend',
              status: 'action-required',
              actionType: 'set_expected_spend_amount',
            },
          ],
        });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          recheckOnFocus: true,
        }),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({ type: 'pending' }),
      );

      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'expected_spend',
        }),
      );
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
    });

    it('rechecks an identity review when the app returns to the foreground', async () => {
      const listeners: ((state: string) => void)[] = [];
      (AppState.addEventListener as jest.Mock).mockImplementation(
        (_type, listener) => {
          listeners.push(listener as (state: string) => void);
          return { remove: jest.fn() };
        },
      );

      controller.getSpendingPrerequisites
        .mockResolvedValueOnce({
          prerequisites: [{ stage: 'kyc', status: 'pending' }],
        })
        .mockResolvedValueOnce({
          prerequisites: [
            {
              stage: 'expected_spend',
              status: 'action-required',
              actionType: 'set_expected_spend_amount',
            },
          ],
        });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          recheckOnFocus: true,
        }),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({ type: 'pending' }),
      );

      await act(async () => {
        listeners[listeners.length - 1]?.('active');
      });

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'expected_spend',
        }),
      );
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
    });

    it('rechecks an identity review on its own while the waiting view is up', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [{ stage: 'kyc', status: 'pending' }],
      });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          kycReviewSelfCheck: true,
        }),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({ type: 'pending' }),
      );
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);

      jest.useFakeTimers();
      // A focus cycle re-creates the self-check interval under fake timers
      // (same pattern as the card home data poll tests above).
      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);
      act(() => {
        jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS - 1);
      });
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
      act(() => {
        jest.advanceTimersByTime(1);
      });
      // The re-run reconcile awaits before it asks for prerequisites.
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('keeps the review state on screen while a self-check runs', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [{ stage: 'kyc', status: 'pending' }],
      });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          kycReviewSelfCheck: true,
        }),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({ type: 'pending' }),
      );

      jest.useFakeTimers();
      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);
      act(() => {
        jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS);
      });

      expect(result.current.isReconciling).toBe(false);
      expect(result.current.pendingAction).toEqual({ type: 'pending' });
      jest.useRealTimers();
    });

    it('does not start another self-check while one is still running', async () => {
      controller.getSpendingPrerequisites.mockResolvedValueOnce({
        prerequisites: [{ stage: 'kyc', status: 'pending' }],
      });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          kycReviewSelfCheck: true,
        }),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({ type: 'pending' }),
      );
      controller.getSpendingPrerequisites.mockImplementation(
        async () => new Promise(() => undefined),
      );

      jest.useFakeTimers();
      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);
      for (let tick = 0; tick < 3; tick++) {
        act(() => {
          jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS);
        });
        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });
      }

      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('does not report the same routed step again when a review is still pending', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [{ stage: 'kyc', status: 'pending' }],
      });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          kycReviewSelfCheck: true,
        }),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({ type: 'pending' }),
      );

      jest.useFakeTimers();
      mockIsFocused = false;
      rerender(undefined);
      mockIsFocused = true;
      rerender(undefined);
      const routedCalls = () =>
        (mockCreateEventBuilder.mock.calls as unknown[][]).filter(
          (call) => call[0] === MetaMetricsEvents.CARD_BUTTON_CLICKED,
        ).length;
      const before = routedCalls();

      act(() => {
        jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS);
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
      expect(routedCalls()).toBe(before);
      jest.useRealTimers();
    });

    it('does not self-check a review unless the screen opts in', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [{ stage: 'kyc', status: 'pending' }],
      });

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      await waitFor(() =>
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1),
      );

      jest.useFakeTimers();
      act(() => {
        jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS * 3);
      });
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('does not self-check a review while polling is off', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [{ stage: 'kyc', status: 'pending' }],
      });

      renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          kycReviewSelfCheck: true,
          pollIntervalMs: null,
        }),
      );

      await waitFor(() =>
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1),
      );

      jest.useFakeTimers();
      act(() => {
        jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS * 3);
      });
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('quietly retries after a failed reconcile instead of stalling the waiting view', async () => {
      let rejectPrerequisites!: (error: Error) => void;
      controller.getSpendingPrerequisites.mockImplementationOnce(
        async () =>
          new Promise((_, reject) => {
            rejectPrerequisites = reject;
          }),
      );

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() =>
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1),
      );
      // Enable fake timers before the check fails, so the quiet retry timer
      // it schedules is a fake one.
      jest.useFakeTimers();
      await act(async () => {
        rejectPrerequisites(new Error('network down'));
      });
      await act(async () => {
        await Promise.resolve();
      });
      // The failed check still resolves, so the waiting view stays up.
      expect(result.current.isReconciling).toBe(false);
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS);
      });
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('quietly retries after a failed createCard instead of stalling the waiting view', async () => {
      let rejectCreateCard!: (error: Error) => void;
      controller.createCard.mockImplementationOnce(
        async () =>
          new Promise((_, reject) => {
            rejectCreateCard = reject;
          }),
      );

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() =>
        expect(controller.createCard).toHaveBeenCalledTimes(1),
      );

      jest.useFakeTimers();
      await act(async () => {
        rejectCreateCard(new Error('provider 500'));
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(controller.createCard).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS);
      });
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(controller.createCard).toHaveBeenCalledTimes(2);
      const startedCalls = (
        mockCreateEventBuilder.mock.calls as unknown[][]
      ).filter(
        (call) => call[0] === MetaMetricsEvents.CARD_FUNDING_PROCESS_STARTED,
      );
      expect(startedCalls).toHaveLength(1);
      jest.useRealTimers();
    });

    it('backs off quiet createCard retries and then stops', async () => {
      let rejectCreateCard!: (error: Error) => void;
      controller.createCard.mockImplementation(
        async () =>
          new Promise((_, reject) => {
            rejectCreateCard = reject;
          }),
      );

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      await waitFor(() =>
        expect(controller.createCard).toHaveBeenCalledTimes(1),
      );

      jest.useFakeTimers();
      const rejectAndFlush = async () => {
        await act(async () => {
          rejectCreateCard(new Error('provider 500'));
        });
        await act(async () => {
          await Promise.resolve();
        });
      };
      const advanceQuietRetry = async (delay: number) => {
        act(() => {
          jest.advanceTimersByTime(delay);
        });
        await act(async () => {
          await Promise.resolve();
        });
        await act(async () => {
          await Promise.resolve();
        });
      };
      // 5s, 10s, 20s, 40s, 60s, 60s — six retries, then no more.
      const delays = [5_000, 10_000, 20_000, 40_000, 60_000, 60_000];
      for (const delay of delays) {
        await rejectAndFlush();
        await advanceQuietRetry(delay);
      }
      expect(controller.createCard).toHaveBeenCalledTimes(1 + delays.length);

      await act(async () => {
        rejectCreateCard(new Error('provider 500'));
      });
      act(() => {
        jest.advanceTimersByTime(60_000 * 3);
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(controller.createCard).toHaveBeenCalledTimes(1 + delays.length);
      jest.useRealTimers();
    });

    it('keeps retrying a settling funding check after the error retry cap', async () => {
      jest.useFakeTimers();
      mockFundingSettling = true;
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: fundingPrerequisites,
      });

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);

      const settleFor = async (delay: number) => {
        await act(async () => {
          jest.advanceTimersByTime(delay);
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });
      };
      // 5s, 10s, 20s, 40s, 60s, 60s, then another 60s past the error cap.
      const delays = [5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000];
      for (const delay of delays) {
        await settleFor(delay);
      }

      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(
        1 + delays.length,
      );
      jest.useRealTimers();
    });

    it('still retries a failed reconcile after a long funding settle', async () => {
      jest.useFakeTimers();
      mockFundingSettling = true;
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: fundingPrerequisites,
      });

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      const settleFor = async (delay: number) => {
        await act(async () => {
          jest.advanceTimersByTime(delay);
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });
      };
      await settleFor(0);
      // Seven settling waits: past the six-retry error budget.
      for (const delay of [5_000, 10_000, 20_000, 40_000, 60_000, 60_000]) {
        await settleFor(delay);
      }
      controller.getSpendingPrerequisites.mockRejectedValue(
        new Error('network blip'),
      );
      await settleFor(60_000);
      const callsAfterFailure =
        controller.getSpendingPrerequisites.mock.calls.length;

      await settleFor(60_000);

      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(
        callsAfterFailure + 1,
      );
      jest.useRealTimers();
    });

    it('rechecks the review when pull to refresh asks', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [{ stage: 'kyc', status: 'pending' }],
      });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({ type: 'pending' }),
      );
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.recheck();
      });

      await waitFor(() =>
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2),
      );
      expect(result.current.pendingAction).toEqual({ type: 'pending' });
    });

    it('stops self-checking while the screen is not focused', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [{ stage: 'kyc', status: 'pending' }],
      });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          kycReviewSelfCheck: true,
        }),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({ type: 'pending' }),
      );
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);

      mockIsFocused = false;
      rerender(undefined);
      jest.useFakeTimers();
      act(() => {
        jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS * 3);
      });
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('stops self-checking and retrying after unmount', async () => {
      let rejectPrerequisites!: (error: Error) => void;
      controller.getSpendingPrerequisites.mockImplementationOnce(
        async () =>
          new Promise((_, reject) => {
            rejectPrerequisites = reject;
          }),
      );

      const { unmount } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() =>
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1),
      );
      // Enable fake timers before the check fails, so the quiet retry timer
      // it schedules is a fake one.
      jest.useFakeTimers();
      await act(async () => {
        rejectPrerequisites(new Error('network down'));
      });
      await act(async () => {
        await Promise.resolve();
      });
      unmount();

      // Neither the quiet retry timer nor any self-check keeps asking after
      // the screen is gone.
      jest.advanceTimersByTime(CARD_SETUP_PENDING_POLL_MS * 3);
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('does not restart the reconcile while it is already reconciling', async () => {
      controller.getSpendingPrerequisites
        .mockResolvedValueOnce({
          prerequisites: [{ stage: 'kyc', status: 'pending' }],
        })
        .mockImplementation(async () => new Promise(() => undefined));

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({ type: 'pending' }),
      );
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.recheck();
      });
      // The recheck drops the resolved flag, so the screen reads reconciling
      // while the check runs, and a second recheck must not restart it.
      await waitFor(() => expect(result.current.isReconciling).toBe(true));
      act(() => {
        result.current.recheck();
      });
      expect(controller.getSpendingPrerequisites).toHaveBeenCalledTimes(2);
    });

    it('notifies when a focused reconcile finds a permanent rejection', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [{ stage: 'kyc', status: 'blocked' }],
      });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'rejected',
          canRetry: false,
          retryUrl: undefined,
          reasons: [],
        }),
      );
      expect(mockNotifyKycRejected).toHaveBeenCalledTimes(1);
      expect(mockNotifyKycRejected).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'rejected', canRetry: false }),
        { source: 'reconcile' },
      );
    });

    it('does not check or notify a permanent rejection while the screen is not focused', () => {
      mockIsFocused = false;
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [{ stage: 'kyc', status: 'blocked' }],
      });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          recheckOnFocus: true,
        }),
      );

      expect(result.current.pendingAction).toBeNull();
      expect(controller.getSpendingPrerequisites).not.toHaveBeenCalled();
      expect(mockNotifyKycRejected).not.toHaveBeenCalled();
    });

    it('notifies a permanent rejection when the screen is focused again', async () => {
      mockIsFocused = false;
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [{ stage: 'kyc', status: 'blocked' }],
      });

      const { result, rerender } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData, {
          recheckOnFocus: true,
        }),
      );

      expect(mockNotifyKycRejected).not.toHaveBeenCalled();

      mockIsFocused = true;
      rerender(undefined);

      await waitFor(() =>
        expect(result.current.pendingAction?.type).toBe('rejected'),
      );
      await waitFor(() =>
        expect(mockNotifyKycRejected).toHaveBeenCalledTimes(1),
      );
    });

    it('keeps a retryable rejection without toasting', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [
          {
            stage: 'kyc',
            status: 'kyc_check_failed',
            params: { kycUrl: 'https://verify.immersve.com/retry' },
          },
        ],
      });

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() =>
        expect(result.current.pendingAction).toEqual({
          type: 'rejected',
          canRetry: true,
          retryUrl: 'https://verify.immersve.com/retry',
          reasons: [],
        }),
      );
      expect(mockNotifyKycRejected).not.toHaveBeenCalled();
    });

    it('does not reconcile when not provisioning', async () => {
      renderHook(() => useImmersveCardProvisioning({ alerts: [] } as never));

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockResolve).not.toHaveBeenCalled();
      expect(controller.createCard).not.toHaveBeenCalled();
      expect(mockRoute).not.toHaveBeenCalled();
    });
  });
});
