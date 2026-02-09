import type { HIP4Market } from '../../types/hip4-types';

export interface HIP4MarketCardProps {
  /** HIP-4 market data to display */
  market: HIP4Market;
  /** Callback when the card is pressed */
  onPress?: (market: HIP4Market) => void;
  /** Optional test ID for E2E testing */
  testID?: string;
}
