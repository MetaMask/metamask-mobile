/**
 * Props for the SrpInputGrid component
 * This component provides a reusable Secret Recovery Phrase input grid
 * that handles both single textarea and multi-input modes
 */
export interface SrpInputGridProps {
  /**
   * Array of seed phrase words
   */
  seedPhrase: string[];

  /**
   * Callback when seed phrase array changes
   */
  onSeedPhraseChange: React.Dispatch<React.SetStateAction<string[]>>;

  /**
   * Callback when error state changes
   */
  onError?: (error: string) => void;

  /**
   * Prefix for test IDs (e.g., 'seed-phrase-input' or 'import-from-seed-input')
   */
  testIDPrefix: string;

  /**
   * Placeholder text for the first input (textarea mode)
   */
  placeholderText: string;

  /**
   * Unique ID for key generation (optional, will generate if not provided)
   */
  uniqueId?: string;

  /**
   * Whether the inputs should be disabled
   */
  disabled?: boolean;

  /**
   * Whether the first input should auto-focus
   */
  autoFocus?: boolean;
}
