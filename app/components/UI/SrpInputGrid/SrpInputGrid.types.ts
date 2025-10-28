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
   * Index of the currently focused input
   */
  seedPhraseInputFocusedIndex: number | null;

  /**
   * Index of the next input to focus
   */
  nextSeedPhraseInputFocusedIndex: number | null;

  /**
   * Map of word indices that have validation errors
   */
  errorWordIndexes: Record<number, boolean>;

  /**
   * General error message to display
   */
  error?: string;

  /**
   * Callback when seed phrase array changes
   */
  onSeedPhraseChange: React.Dispatch<React.SetStateAction<string[]>>;

  /**
   * Callback when focus index changes
   */
  onFocusChange: (index: number | null) => void;

  /**
   * Callback when next focus index changes
   */
  onNextFocusChange: (index: number | null) => void;

  /**
   * Callback for paste action
   */
  onPaste: () => Promise<void>;

  /**
   * Callback for clear action
   */
  onClear: () => void;

  /**
   * Ref to store input references for programmatic focus
   */
  seedPhraseInputRefs: React.MutableRefObject<Map<
    number,
    { focus: () => void; blur: () => void }
  > | null>;

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
