export interface ExpirationRowProps {
  /**
   * Human-readable expiration, e.g. "1 week".
   */
  value: string;
  /**
   * Fired when the expiration value is pressed.
   */
  onPress: () => void;
  /**
   * Optional test ID for the root element.
   */
  testID?: string;
}
