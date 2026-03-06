import { PredictMarket, PredictOutcomeToken } from '../../types';

export interface PredictGameDetailsContentProps {
  market: PredictMarket;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  onBetPress: (token: PredictOutcomeToken) => void;
  onClaimPress?: () => void;
  claimableAmount?: number;
  isClaimDisabled?: boolean;
  isLoading?: boolean;
}
