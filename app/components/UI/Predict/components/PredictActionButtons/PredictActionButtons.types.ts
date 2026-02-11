import {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import { ButtonBaseSize } from '@metamask/design-system-react-native';

export type PredictBetButtonVariant = 'yes' | 'no';

export interface PredictBetButtonProps {
  label: string;
  price: number;
  onPress: () => void;
  variant: PredictBetButtonVariant;
  teamColor?: string;
  disabled?: boolean;
  testID?: string;
  size?: ButtonBaseSize;
}

export interface PredictBetButtonsProps {
  yesLabel: string;
  yesPrice: number;
  onYesPress: () => void;
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
  testID?: string;
}

export interface PredictActionButtonsProps {
  market: PredictMarket;
  outcome: PredictOutcome;
  onBetPress: (token: PredictOutcomeToken) => void;
  onClaimPress?: () => void;
  claimableAmount?: number;
  isLoading?: boolean;
  testID?: string;
  isCarousel?: boolean;
}
