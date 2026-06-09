import { RouteProp } from '@react-navigation/native';
import { SubscriptionBenefitDto } from '../../../../core/Engine/controllers/rewards-controller/types.ts';

export interface BenefitFullViewRouteParams {
  benefit: SubscriptionBenefitDto;
}

export type BenefitFullViewRouteProp = RouteProp<
  { params: BenefitFullViewRouteParams },
  'params'
>;
