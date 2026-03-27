import { RootState } from '..';
import {SubscriptionBenefitDto} from '../../core/Engine/controllers/rewards-controller/types.ts';

export const selectBenefits = (state: RootState): SubscriptionBenefitDto[] =>
  state.benefits.benefits;

export const selectBenefitsLoading = (state: RootState): boolean =>
  state.benefits.benefitsLoading;


