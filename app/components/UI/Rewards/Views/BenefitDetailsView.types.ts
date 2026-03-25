import { RouteProp } from '@react-navigation/native';
import { SubscriptionBenefitDto } from '../../../../core/Engine/controllers/rewards-controller/types.ts';

export interface BenefitDetailsViewRouteParams {
  benefit: SubscriptionBenefitDto;
}

export type BenefitDetailsViewRouteProp = RouteProp<
  { params: BenefitDetailsViewRouteParams },
  'params'
>;
