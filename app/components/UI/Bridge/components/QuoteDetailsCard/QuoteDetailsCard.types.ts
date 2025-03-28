export interface QuoteDetailsCardProps {
  /**
   * Source network name
   */
  sourceNetwork: {
    name: string;
    iconUrl?: string;
  };
  /**
   * Destination network name
   */
  destNetwork: {
    name: string;
    iconUrl?: string;
  };
  /**
   * Network fee in USD
   */
  networkFee: string;
  /**
   * Estimated time for the transaction
   */
  estimatedTime: string;
  /**
   * Quote details
   */
  quote: {
    rate: string;
    priceImpact: string;
  };
  /**
   * Current slippage setting
   */
  slippage: string;
  /**
   * Callback when slippage is pressed
   */
  onSlippagePress: () => void;
  /**
   * ID for testing purposes
   */
  testID?: string;
}
