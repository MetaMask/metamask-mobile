import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useImmersveCardProvisioning } from './useImmersveCardProvisioning';
import Engine from '../../../../../../core/Engine';
import {
  CardProviderError,
  CardProviderErrorCode,
  type CardHomeData,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

let mockProviderId: string | null = 'immersve';
let mockReduxFundingSourceId: string | null = 'fs-1';
let mockSelectedCountry: string | null = 'GB';
let mockFundingChannelId: string | undefined = 'base-channel';
let mockIsFocused = true;
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
  selectCardFeatureFlag: () => ({
    immersve: { fundingChannelId: mockFundingChannelId },
  }),
}));
jest.mock('../../../../../../core/redux/slices/card', () => ({
  selectImmersveFundingSourceId: () => mockReduxFundingSourceId,
  setImmersveFundingSourceId: (id: string) => ({
    type: 'card/setImmersveFundingSourceId',
    payload: id,
  }),
}));

const mockRoute = jest.fn();
jest.mock('../../../hooks/useImmersveOnboardingRouter', () => ({
  useImmersveOnboardingRouter: () => mockRoute,
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
    mockIsFocused = true;
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
      rerender();
      mockIsFocused = true;
      rerender();
      controller.fetchCardHomeData.mockClear();
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(controller.fetchCardHomeData).toHaveBeenCalledTimes(2);
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

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      await waitFor(() =>
        expect(controller.getSpendingPrerequisites).toHaveBeenCalledWith(
          'fs-resolved',
          expect.any(Object),
        ),
      );
      expect(mockResolve).toHaveBeenCalledWith({
        fundingChannelId: 'base-channel',
        existingId: null,
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/setImmersveFundingSourceId',
        payload: 'fs-resolved',
      });
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
