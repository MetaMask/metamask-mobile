export interface AccountRightButtonProps {
  selectedAddress: string;
  onPress: () => void;
  isNetworkVisible?: boolean;
  disableNonEvm?: boolean;
}
