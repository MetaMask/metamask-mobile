import { RouteProp } from '@react-navigation/native';
import { SubscriptionBenefitDto } from '../../../../core/Engine/controllers/rewards-controller/types.ts';
import Routes from '../../../../constants/navigation/Routes.ts';

export interface BenefitFullViewRouteParams {
  benefit: SubscriptionBenefitDto;
}

export type BenefitFullViewRouteProp = RouteProp<
  { [Routes.REWARD_BENEFIT_FULL_VIEW]: BenefitFullViewRouteParams },
  typeof Routes.REWARD_BENEFIT_FULL_VIEW
>;
