export interface SFAddressFromProps {
  chainId: string;
  fromAccountBalanceState: (value: boolean) => void;
  setFromAddress: (address: string) => void;
}
