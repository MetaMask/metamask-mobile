export interface LimitOrderCostToleranceInfoSheetProps {
  /**
   * Minimum percentage of the displayed output amount the user is
   * guaranteed to receive, i.e. `100 - cost tolerance`.
   */
  minReceivedPercentage: number;
  /**
   * Pops this sheet off the Bridge modal stack when it closes.
   */
  goBack: () => void;
}
