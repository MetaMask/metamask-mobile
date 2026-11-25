export interface LimitOrderDetailsProps {
  /**
   * Human-readable expiration, e.g. "1 week".
   */
  expiration: string;
  /**
   * Fired when the expiration row is pressed.
   */
  onExpirationPress: () => void;
  /**
   * Cost tolerance shown on the cost tolerance row, e.g. "2%".
   */
  costTolerance: string;
  /**
   * Fired when the cost tolerance row is pressed.
   */
  onCostTolerancePress: () => void;
  /**
   * Optional test ID for the root element.
   */
  testID?: string;
}
