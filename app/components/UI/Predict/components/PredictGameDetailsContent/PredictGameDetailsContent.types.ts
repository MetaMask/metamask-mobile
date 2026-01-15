import { PredictMarket } from '../../types';

export interface PredictGameDetailsContentProps {
  market: PredictMarket;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}
