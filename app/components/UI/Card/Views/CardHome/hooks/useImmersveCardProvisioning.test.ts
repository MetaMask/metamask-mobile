import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useImmersveCardProvisioning } from './useImmersveCardProvisioning';
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

    it('does not poll while Card Home is not focused', async () => {
      mockIsFocused = false;

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      await waitFor(() => expect(result.current.isReconciling).toBe(false));
      jest.useFakeTimers();
      controller.fetchCardHomeData.mockClear();
      jest.advanceTimersByTime(10000);
      expect(controller.fetchCardHomeData).not.toHaveBeenCalled();
      jest.useRealTimers();
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
        { type: 'kyc', url: 'https://kyc', ctaHint: undefined },
        { navigateFromRoot: true, countryKey: 'GB' },
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
