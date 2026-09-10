import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import {
  MoneyAccountFeature,
  PRODUCT_TYPES,
  ShieldFeature,
  type SubscriptionBenefitsState,
} from '@metamask/subscription-controller';
import type { RootState } from '../reducers';
import configureStore from '../util/test/configureStore';
import {
  MoneyAccountPlusBenefitsStatus,
  useMoneyAccountPlusBenefits,
} from './useMoneyAccountPlusBenefits';
import { usePlusBenefitDetail } from './usePlusBenefitDetail';
import useMoneyVaultApy from '../components/UI/Money/hooks/useMoneyVaultApy';

jest.mock('./useMoneyAccountPlusBenefits', () => ({
  ...jest.requireActual('./useMoneyAccountPlusBenefits'),
  useMoneyAccountPlusBenefits: jest.fn(),
}));

jest.mock('../components/UI/Money/hooks/useMoneyVaultApy', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseMoneyAccountPlusBenefits = jest.mocked(
  useMoneyAccountPlusBenefits,
);
const mockUseMoneyVaultApy = jest.mocked(useMoneyVaultApy);

const BENEFITS: SubscriptionBenefitsState = {
  billingPeriodId: 'bp_2026_08_15',
  swaps: {
    feeBips: '0',
    capMicroUsd: 500_000_000,
    consumedMicroUsd: 100_000_000,
    remainingMicroUsd: 400_000_000,
    exhausted: false,
  },
  perps: {
    builderFeeBips: '0',
    builderCode: 'code',
    capMicroUsd: 1_000_000_000,
    consumedMicroUsd: 0,
    remainingMicroUsd: 1_000_000_000,
    exhausted: false,
  },
  predict: {
    builderCode: 'code',
    capTxCount: 1,
    consumedTxCount: 0,
    remainingTxCount: 1,
    exhausted: false,
  },
};

const createState = (): RootState =>
  ({
    engine: {
      backgroundState: {
        SubscriptionController: {
          subscriptions: [],
          trialedProducts: [],
          benefits: BENEFITS,
          productEntitlements: {
            [PRODUCT_TYPES.MONEY_ACCOUNT_PLUS]: {
              plan: 'premium',
              entitlements: {
                [MoneyAccountFeature.SwapFeeWaiver]: true,
                [MoneyAccountFeature.PerpsFeeWaiver]: true,
                [MoneyAccountFeature.PredictFreeTx]: true,
                [MoneyAccountFeature.PremiumApy]: true,
              },
            },
            [PRODUCT_TYPES.SHIELD]: {
              entitlements: {
                [ShieldFeature.ShieldClaim]: true,
                [ShieldFeature.PrioritySupport]: true,
              },
            },
          },
        },
      },
    },
  }) as unknown as RootState;

const renderDetail = (id: Parameters<typeof usePlusBenefitDetail>[0]) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={configureStore(createState())}>{children}</Provider>
  );

  return renderHook(() => usePlusBenefitDetail(id), { wrapper: Wrapper });
};

describe('usePlusBenefitDetail', () => {
  beforeEach(() => {
    mockUseMoneyAccountPlusBenefits.mockReturnValue({
      status: MoneyAccountPlusBenefitsStatus.Ready,
      items: [],
      benefits: BENEFITS,
      resetsOn: 'Sep 15',
      isRefreshing: false,
      hasError: false,
      retry: jest.fn(),
    });
    mockUseMoneyVaultApy.mockReturnValue({
      vaultApyQuery: {} as never,
      apyDecimal: 0.07,
      apyPercent: 7,
      apyPercentFormatted: '7%',
    });
  });

  it('returns undefined when no benefit is selected', () => {
    const { result } = renderDetail(null);

    expect(result.current).toBeUndefined();
  });

  it('maps the selected swaps benefit from controller state', () => {
    const { result } = renderDetail('swaps');

    expect(result.current?.id).toBe('swaps');
    expect(result.current?.used).toBe(100);
    expect(result.current?.allowance).toBe(500);
    expect(result.current?.resetsOn).toBe('Sep 15');
  });
});
