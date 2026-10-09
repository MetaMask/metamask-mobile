export interface CostToleranceRowProps {
  /**
   * Cost tolerance shown on the row, e.g. "2%".
   */
  value: string;
  /**
   * Fired when the cost tolerance value is pressed.
   */
  onPress: () => void;
  /**
   * Optional test ID for the root element.
   */
  testID?: string;
}
