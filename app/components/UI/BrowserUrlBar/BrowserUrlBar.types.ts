export enum ConnectionType {
  SECURE = 'secure',
  UNSECURE = 'unsecure',
  UNKNOWN = 'unknown',
}

/**
 * BrowserUrlBar props
 */
export type BrowserUrlBarProps = {
  connectionType: ConnectionType;
  onSubmitEditing: (text: string) => void;
  onCancel: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (text: string) => void;
  connectedAccounts: string[];
  activeUrlRef: React.RefObject<string>;
};
