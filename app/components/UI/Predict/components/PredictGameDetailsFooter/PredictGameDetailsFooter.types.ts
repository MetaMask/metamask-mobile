import {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';

export interface PredictGameDetailsFooterProps {
  market: PredictMarket;
  outcome: PredictOutcome;
  onBetPress: (token: PredictOutcomeToken) => void;
  onClaimPress?: () => void;
  onInfoPress: () => void;
  claimableAmount?: number;
  isLoading?: boolean;
  testID?: string;
  awayColor?: string;
  homeColor?: string;
}

export interface PredictGameAboutSheetProps {
  description: string;
  onClose?: () => void;
}

export interface PredictGameAboutSheetRef {
  onOpenBottomSheet: () => void;
  onCloseBottomSheet: () => void;
}
