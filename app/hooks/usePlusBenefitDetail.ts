import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  MoneyAccountFeature,
  ShieldFeature,
} from '@metamask/subscription-controller';
import useMoneyVaultApy from '../components/UI/Money/hooks/useMoneyVaultApy';
import {
  mapPlusBenefitToDetail,
  type PlusBenefitDetail,
  type PlusBenefitDetailId,
} from '../components/Views/ProHub/components/MemberPricingOnTrades/mapPlusBenefitToDetail';
import type { RootState } from '../reducers';
import {
  selectHasMoneyAccountPlusEntitlement,
  selectHasShieldEntitlement,
} from '../selectors/subscriptionController';
import {
  MoneyAccountPlusBenefitsStatus,
  useMoneyAccountPlusBenefits,
} from './useMoneyAccountPlusBenefits';

/**
 * Builds the selected Pro Hub benefit-detail model from entitlements,
 * persisted benefits, and (for Earn) vault APY.
 *
 * @param id - The benefit currently opened in the sheet, if any.
 * @returns The sheet model, or undefined when no benefit is selected.
 */
export function usePlusBenefitDetail(
  id: PlusBenefitDetailId | null,
): PlusBenefitDetail | undefined {
  const { benefits, resetsOn, hasError, status } =
    useMoneyAccountPlusBenefits();
  const { apyPercentFormatted } = useMoneyVaultApy();
  const swapFeeWaiver = useSelector((state: RootState) =>
    selectHasMoneyAccountPlusEntitlement(
      state,
      MoneyAccountFeature.SwapFeeWaiver,
    ),
  );
  const perpsFeeWaiver = useSelector((state: RootState) =>
    selectHasMoneyAccountPlusEntitlement(
      state,
      MoneyAccountFeature.PerpsFeeWaiver,
    ),
  );
  const predictFreeTx = useSelector((state: RootState) =>
    selectHasMoneyAccountPlusEntitlement(
      state,
      MoneyAccountFeature.PredictFreeTx,
    ),
  );
  const premiumApy = useSelector((state: RootState) =>
    selectHasMoneyAccountPlusEntitlement(state, MoneyAccountFeature.PremiumApy),
  );
  const shieldClaim = useSelector((state: RootState) =>
    selectHasShieldEntitlement(state, ShieldFeature.ShieldClaim),
  );
  const prioritySupport = useSelector((state: RootState) =>
    selectHasShieldEntitlement(state, ShieldFeature.PrioritySupport),
  );

  return useMemo(() => {
    if (!id) {
      return undefined;
    }

    return mapPlusBenefitToDetail({
      id,
      benefits,
      benefitsFailed:
        hasError && status === MoneyAccountPlusBenefitsStatus.Failed,
      plusEntitlements: {
        swapFeeWaiver,
        perpsFeeWaiver,
        predictFreeTx,
        premiumApy,
      },
      shieldEntitlements: {
        shieldClaim,
        prioritySupport,
      },
      resetsOn,
      apyPercentFormatted,
    });
  }, [
    id,
    benefits,
    hasError,
    status,
    swapFeeWaiver,
    perpsFeeWaiver,
    predictFreeTx,
    premiumApy,
    shieldClaim,
    prioritySupport,
    resetsOn,
    apyPercentFormatted,
  ]);
}
