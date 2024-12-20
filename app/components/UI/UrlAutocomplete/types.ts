import { View } from 'react-native';

/**
 * Props for the UrlAutocomplete component
 */
export type UrlAutocompleteComponentProps = {
  /**
   * Callback that is triggered while
   * choosing one of the autocomplete options
   */
  onSubmit: (url: string) => void;
  /**
   * Callback that is triggered while
   * tapping on the background
   */
  onDismiss: () => void;
};

/**
 * Ref for the UrlAutocomplete component
 */
export type UrlAutocompleteRef = {
  /**
   * Search for autocomplete results
   */
  search: (text: string) => void;
  /**
   * Hide the autocomplete results
   */
  hide: () => void;
  /**
   * Show the autocomplete results
   */
  show: () => void;
};

/**
 * The result of an Fuse search
 */
export type FuseSearchResult = {
  url: string;
  name: string;
};
