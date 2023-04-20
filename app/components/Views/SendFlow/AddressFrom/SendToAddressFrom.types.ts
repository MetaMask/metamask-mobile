export interface STAddressFromProps {
  accountAddress: string;
  accountName: string;
  accountBalance: string | undefined;
  updateAccountInfo: ({
    address,
    accName,
    balance,
    isBalanceZero,
  }: {
    address: string;
    accName: string;
    balance: string;
    isBalanceZero: boolean;
  }) => void;
}

export interface SelectedAsset {
  address: string;
  isETH: boolean;
  logo: string;
  name: string;
  symbol: string;
}
