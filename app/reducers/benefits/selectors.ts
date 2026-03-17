import { RootState } from '..';
import {SubscriptionBenefitDto} from '../../core/Engine/controllers/rewards-controller/types.ts';

export const selectFirstBenefit = (state: RootState): SubscriptionBenefitDto | null =>
  state.benefits.benefits[0] ?? null;

export const selectBenefits = (state: RootState): SubscriptionBenefitDto[] =>
  state.benefits.benefits;

export const selectBenefitsLoading = (state: RootState): boolean =>
  state.benefits.benefitsLoading;

export const selectHasMoreBenefits = (state: RootState): boolean =>
  state.benefits.hasNextPage;

export const selectCurrentBenefitsPage = (state: RootState): number =>
  state.benefits.currentPage;

export const selectBenefitsHasNextPage = (state: RootState): boolean =>
  state.benefits.hasNextPage;

