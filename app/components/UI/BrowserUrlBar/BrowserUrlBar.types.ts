/**
 * Connection type for identifying the icon of the browser url bar
 */
export enum ConnectionType {
  SECURE = 'secure',
  UNSECURE = 'unsecure',
  UNKNOWN = 'unknown',
}

/**
 * Ref for the BrowserUrlBar component
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BrowserUrlBarRef = {
  hide: () => void;
  blur: () => void;
  focus: () => void;
  setNativeProps: (props: object) => void;
  /**
   * Skip the next TextInput blur unfocus. Used when tapping autocomplete
   * results so urlbar stays focused until WebView navigation starts.
   */
  suppressNextBlur: () => void;
};

/**
 * BrowserUrlBar props
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BrowserUrlBarProps = {
  connectionType: ConnectionType;
  onSubmitEditing: (text: string) => void;
  onCancel: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (text: string) => void;
  connectedAccounts: string[];
  activeUrl: string;
  setIsUrlBarFocused: (focused: boolean) => void;
  isUrlBarFocused: boolean;
  showTabs?: () => void;
};
