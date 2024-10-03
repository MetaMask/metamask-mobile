import { RouteProp } from '@react-navigation/native';

interface StakeReviewViewParams {
  wei: string;
  fiat: string;
}

export interface StakeReviewViewProps {
  route: RouteProp<{ params: StakeReviewViewParams }, 'params'>;
}
