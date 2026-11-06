export interface InsufficientBalanceBannerProps {
  /**
   * Set when the source token balance is below the amount being paid. The
   * order can still be placed, so this only adds a warning with a shortcut to
   * a Market swap into the source token.
   */
  insufficientBalance?: {
    onSwapIntoSourceTokenPress: () => void;
  };
  /**
   * Symbol of the token being paid, e.g. "ETH".
   */
  sourceTokenSymbol: string;
}
