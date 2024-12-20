/**
 * BrowserUrlBar props
 */
export type BrowserUrlBarProps = {
  isSecureConnection: boolean;
  onSubmitEditing: (text: string) => void;
  onCancel: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (text: string) => void;
  connectedAccounts: string[];
  activeUrl: string;
};
