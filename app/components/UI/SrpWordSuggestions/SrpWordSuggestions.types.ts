/**
 * Props for the SrpWordSuggestions component
 */
export interface SrpWordSuggestionsProps {
  /**
   * The current word being typed in the input field
   * Used to filter BIP39 wordlist for suggestions
   */
  currentInputWord: string;

  /**
   * Callback when a suggestion is selected
   * @param word - The selected BIP39 word
   */
  onSuggestionSelect: (word: string) => void;

  /**
   * Callback when a suggestion button press begins
   * Used to prevent keyboard dismissal during selection
   */
  onPressIn?: () => void;
}
