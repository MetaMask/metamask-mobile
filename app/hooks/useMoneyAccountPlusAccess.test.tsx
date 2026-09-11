import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import {
  MoneyAccountFeature,
  PRODUCT_TYPES,
  SUBSCRIPTION_STATUSES,
  type MoneyAccountEntitlements,
  type Subscription,
} from '@metamask/subscription-controller';
import type { RootState } from '../reducers';
import configureStore from '../util/test/configureStore';
import Engine from '../core/Engine';
import { __resetForTest } from '../core/Subscription/entitlementResolution';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';

jest.mock('../core/Engine', () => ({
  context: {
    SubscriptionController: {
      getSubscriptions: jest.fn(),
    },
  },
}));

jest.mock('../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('./useProSubscriptionEnabled');

// Held in a variable so a test can switch accounts between renders;
// configureStore snapshots state, so it cannot model that on its own.
let mockSelectedAccountId: string | undefined = 'account-1';

jest.mock('../selectors/accountsController', () => ({
  ...jest.requireActual('../selectors/accountsController'),
  selectSelectedInternalAccountId: () => mockSelectedAccountId,
}));

const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);
const mockGetSubscriptions = jest.mocked(
  Engine.context.SubscriptionController.getSubscriptions,
);

const ACCOUNT_ID = 'account-1';

const createSubscription = (
  status: Subscription['status'],
  cancelAtPeriodEnd?: boolean,
): Partial<Subscription> => ({
  id: 'sub-plus',
  status,
  cancelAtPeriodEnd,
  products: [
    {
      name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      currency: 'usd',
      unitAmount: 499,
      unitDecimals: 2,
    },
  ],
});

const createState = ({
  isSignedIn = true,
  isUnlocked = true,
  accountId = ACCOUNT_ID,
  status,
  cancelAtPeriodEnd,
  entitlements,
}: {
  isSignedIn?: boolean;
  isUnlocked?: boolean;
  accountId?: string;
  status?: Subscription['status'];
  cancelAtPeriodEnd?: boolean;
  entitlements?: Partial<MoneyAccountEntitlements>;
} = {}) =>
  ({
    engine: {
      backgroundState: {
        AuthenticationController: { isSignedIn },
        KeyringController: { isUnlocked, keyrings: [] },
        AccountsController: {
          internalAccounts: {
            selectedAccount: accountId,
            accounts: { [accountId]: { id: accountId } },
          },
        },
        SubscriptionController: {
          subscriptions: status
            ? [createSubscription(status, cancelAtPeriodEnd)]
            : [],
          trialedProducts: [],
          ...(entitlements
            ? {
                productEntitlements: {
                  [PRODUCT_TYPES.MONEY_ACCOUNT_PLUS]: {
                    plan: 'premium',
                    entitlements: {
                      swapFeeWaiver: false,
                      perpsFeeWaiver: false,
                      predictFreeTx: false,
                      premiumApy: false,
                      ...entitlements,
                    },
                  },
                },
              }
            : {}),
        },
      },
    },
  }) as unknown as RootState;

const renderAccess = (state: RootState) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={configureStore(state)}>{children}</Provider>
  );

  return renderHook(() => useMoneyAccountPlusAccess(), { wrapper: Wrapper });
};

/**
 * Renders the hook and lets the entitlement fetch settle, which is what most
 * cases care about — the state after resolution rather than mid-flight.
 *
 * @param state - The Redux state to render against.
 * @returns The rendered hook result.
 */
const renderResolvedAccess = async (state: RootState) => {
  const rendered = renderAccess(state);
  await act(async () => {
    await Promise.resolve();
  });
  return rendered;
};

describe('useMoneyAccountPlusAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetForTest();
    mockSelectedAccountId = ACCOUNT_ID;
    mockGetSubscriptions.mockResolvedValue([]);
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
      variantName: 'treatment',
      isActive: true,
    });
  });

  describe('when the A/B flag is off', () => {
    beforeEach(() => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: false,
        variantName: 'control',
        isActive: false,
      });
    });

    it('is disabled even for an active subscriber', async () => {
      const { result } = await renderResolvedAccess(
        createState({
          status: SUBSCRIPTION_STATUSES.active,
          entitlements: { premiumApy: true },
        }),
      );

      expect(result.current).toBe(MoneyAccountPlusAccess.Disabled);
    });

    it('does not fetch entitlements', async () => {
      await renderResolvedAccess(createState());

      expect(mockGetSubscriptions).not.toHaveBeenCalled();
    });
  });

  describe('while entitlements are unresolved', () => {
    it('reports loading so no Pro UI renders against unknown state', () => {
      mockGetSubscriptions.mockReturnValue(new Promise(() => undefined));

      const { result } = renderAccess(
        createState({ status: SUBSCRIPTION_STATUSES.active }),
      );

      expect(result.current).toBe(MoneyAccountPlusAccess.Loading);
    });

    it('resolves once the fetch settles', async () => {
      const { result } = await renderResolvedAccess(
        createState({ status: SUBSCRIPTION_STATUSES.active }),
      );

      expect(result.current).toBe(MoneyAccountPlusAccess.Subscriber);
    });
  });

  describe('entitlement states', () => {
    it('treats an active subscriber as a subscriber', async () => {
      const { result } = await renderResolvedAccess(
        createState({
          status: SUBSCRIPTION_STATUSES.active,
          entitlements: { premiumApy: true },
        }),
      );

      expect(result.current).toBe(MoneyAccountPlusAccess.Subscriber);
    });

    it('keeps a past_due subscriber with retained entitlements in Pro', async () => {
      const { result } = await renderResolvedAccess(
        createState({
          status: SUBSCRIPTION_STATUSES.pastDue,
          entitlements: { [MoneyAccountFeature.SwapFeeWaiver]: true },
        }),
      );

      expect(result.current).toBe(MoneyAccountPlusAccess.Subscriber);
    });

    it('treats a cancelled-at-period-end subscriber as a subscriber', async () => {
      const { result } = await renderResolvedAccess(
        createState({
          status: SUBSCRIPTION_STATUSES.active,
          cancelAtPeriodEnd: true,
          entitlements: { premiumApy: true },
        }),
      );

      expect(result.current).toBe(MoneyAccountPlusAccess.Subscriber);
    });

    it('treats an expired subscriber with revoked entitlements as eligible', async () => {
      const { result } = await renderResolvedAccess(
        createState({
          status: SUBSCRIPTION_STATUSES.canceled,
          entitlements: {},
        }),
      );

      expect(result.current).toBe(MoneyAccountPlusAccess.Eligible);
    });

    it('treats a non-subscriber as eligible', async () => {
      const { result } = await renderResolvedAccess(createState());

      expect(result.current).toBe(MoneyAccountPlusAccess.Eligible);
    });

    it('falls back to eligible when entitlements are missing after resolution', async () => {
      const { result } = await renderResolvedAccess(
        createState({ status: SUBSCRIPTION_STATUSES.canceled }),
      );

      expect(result.current).toBe(MoneyAccountPlusAccess.Eligible);
    });

    it('falls back to eligible when the fetch fails', async () => {
      mockGetSubscriptions.mockRejectedValue(new Error('network down'));

      const { result } = await renderResolvedAccess(createState());

      expect(result.current).toBe(MoneyAccountPlusAccess.Eligible);
    });
  });

  describe('signed-out and locked sessions', () => {
    it('is eligible without fetching when signed out', async () => {
      const { result } = await renderResolvedAccess(
        createState({ isSignedIn: false }),
      );

      expect(result.current).toBe(MoneyAccountPlusAccess.Eligible);
      expect(mockGetSubscriptions).not.toHaveBeenCalled();
    });

    it('is eligible without fetching when locked', async () => {
      const { result } = await renderResolvedAccess(
        createState({ isUnlocked: false }),
      );

      expect(result.current).toBe(MoneyAccountPlusAccess.Eligible);
      expect(mockGetSubscriptions).not.toHaveBeenCalled();
    });

    it('clears resolution when the session ends so the next user re-resolves', async () => {
      await renderResolvedAccess(createState());
      expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);

      await renderResolvedAccess(createState({ isSignedIn: false }));

      await renderResolvedAccess(createState());

      expect(mockGetSubscriptions).toHaveBeenCalledTimes(2);
    });
  });

  describe('account changes', () => {
    it('re-resolves entitlements when the selected account changes', async () => {
      const { rerender } = await renderResolvedAccess(createState());
      expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);

      mockSelectedAccountId = 'account-2';
      rerender({});
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockGetSubscriptions).toHaveBeenCalledTimes(2);
    });

    it('does not refetch on re-render for the same account', async () => {
      const { rerender } = await renderResolvedAccess(createState());

      rerender({});
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);
    });
  });
});
