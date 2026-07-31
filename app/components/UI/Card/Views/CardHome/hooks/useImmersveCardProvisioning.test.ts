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
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('polls fetchCardHomeData while provisioning on Immersve', () => {
      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      expect(result.current.isProvisioning).toBe(true);
      jest.advanceTimersByTime(10000);
      expect(controller.fetchCardHomeData).toHaveBeenCalledTimes(2);
    });

    it('does not poll for non-Immersve providers', () => {
      mockProviderId = 'baanx';

      const { result } = renderHook(() =>
        useImmersveCardProvisioning(provisioningData),
      );

      expect(result.current.isProvisioning).toBe(false);
      jest.advanceTimersByTime(10000);
      expect(controller.fetchCardHomeData).not.toHaveBeenCalled();
    });

    it('does not poll when there is no provisioning alert', () => {
      renderHook(() => useImmersveCardProvisioning({ alerts: [] } as never));

      jest.advanceTimersByTime(10000);
      expect(controller.fetchCardHomeData).not.toHaveBeenCalled();
    });

    it('does not poll while Card Home is not focused', () => {
      mockIsFocused = false;

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      jest.advanceTimersByTime(10000);
      expect(controller.fetchCardHomeData).not.toHaveBeenCalled();
    });
  });

  describe('reconcile', () => {
    it('creates the card once when prerequisites are active', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: [],
      });

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      await waitFor(() =>
        expect(controller.createCard).toHaveBeenCalledWith('fs-1'),
      );
      expect(mockRoute).not.toHaveBeenCalled();
    });

    it('redirects a mid-onboarding (non-active) user to the derived step', async () => {
      controller.getSpendingPrerequisites.mockResolvedValue({
        prerequisites: kycPrerequisites,
      });

      renderHook(() => useImmersveCardProvisioning(provisioningData));

      await waitFor(() =>
        expect(mockRoute).toHaveBeenCalledWith(
          { type: 'kyc', url: 'https://kyc' },
          { navigateFromRoot: true, countryKey: 'GB' },
        ),
      );
      expect(controller.createCard).not.toHaveBeenCalled();
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
