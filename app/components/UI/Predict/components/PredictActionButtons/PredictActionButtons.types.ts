import {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import { ButtonBaseSize } from '@metamask/design-system-react-native';

export type PredictBetButtonVariant = 'yes' | 'no' | 'draw';

export type PredictBetButtonLayout = 'inline' | 'stacked';

export interface PredictBetButtonProps {
  label: string;
  price: number;
  onPress: () => void;
  variant: PredictBetButtonVariant;
  teamColor?: string;
  disabled?: boolean;
  testID?: string;
  size?: ButtonBaseSize;
  layout?: PredictBetButtonLayout;
}

export interface PredictBetButtonsProps {
  yesLabel: string;
  yesPrice: number;
  onYesPress: () => void;
  drawLabel?: string;
  drawPrice?: number;
  onDrawPress?: () => void;
  noLabel: string;
  noPrice: number;
  onNoPress: () => void;
  yesTeamColor?: string;
  noTeamColor?: string;
  disabled?: boolean;
  testID?: string;
  isCarousel?: boolean;
}

export interface PredictClaimButtonProps {
  amount?: number;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  isHidden?: boolean;
  testID?: string;
}

export interface PredictActionButtonsProps {
  market: PredictMarket;
  outcome: PredictOutcome;
  onBetPress: (token: PredictOutcomeToken) => void;
  onClaimPress?: () => void;
  claimableAmount?: number;
  isLoading?: boolean;
  isClaimPending?: boolean;
  testID?: string;
  isCarousel?: boolean;
}
