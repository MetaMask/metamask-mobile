import type { StopLossPromptVariant } from '../../hooks/useStopLossPrompt';

export interface PerpsStopLossPromptBannerProps {
  /** Which variant of the banner to display */
  variant: StopLossPromptVariant;
  /** Distance to liquidation as percentage (e.g., 3 for 3%) */
  liquidationDistance: number;
  /** Suggested stop loss price for stop_loss variant */
  suggestedStopLossPrice?: string;
  /** Suggested stop loss as percentage from entry (e.g., -50 for -50%) */
  suggestedStopLossPercent?: number;
  /** Callback when toggle is enabled - directly sets stop loss (stop_loss variant only) */
  onSetStopLoss?: () => void;
  /** Callback when "Add" button is pressed (add_margin variant only) */
  onAddMargin?: () => void;
  /** Whether an action is in progress (shows loading state) */
  isLoading?: boolean;
  /** Whether the action was successful (triggers fade-out animation) */
  isSuccess?: boolean;
  /** Callback when fade-out animation completes */
  onFadeOutComplete?: () => void;
  /** Test ID for e2e testing */
  testID?: string;
}
