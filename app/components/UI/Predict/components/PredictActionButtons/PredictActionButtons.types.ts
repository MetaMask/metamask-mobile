import { ButtonSize } from '../../../../../component-library/components/Buttons/Button';
import {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';

export type PredictBetButtonVariant = 'yes' | 'no';

export type PredictBetButtonSize = 'sm' | 'md' | 'lg';

export const BUTTON_SIZE_MAP: Record<PredictBetButtonSize, ButtonSize> = {
  sm: ButtonSize.Sm,
  md: ButtonSize.Md,
  lg: ButtonSize.Lg,
};

export interface PredictBetButtonProps {
  label: string;
  price: number;
  onPress: () => void;
  variant: PredictBetButtonVariant;
  teamColor?: string;
  size?: PredictBetButtonSize;
  disabled?: boolean;
  testID?: string;
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
  size?: PredictBetButtonSize;
  disabled?: boolean;
  testID?: string;
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
  hasClaimableWinnings?: boolean;
  claimableAmount?: number;
  isLoading?: boolean;
  size?: PredictBetButtonSize;
  testID?: string;
}
