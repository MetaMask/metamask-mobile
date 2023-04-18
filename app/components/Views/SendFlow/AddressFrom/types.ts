export interface SFAddressFromProps {
    accountAddress: string;
    accountName: string;
    accountBalance: string;
    updateAccountInfo: ({accountAddress, accountName, accountBalance, balanceIsZero}: {accountAddress: string, accountName: string, accountBalance: string, balanceIsZero: boolean} ) => void;
}

export interface SelectedAsset {
    address: string;
    isETH: boolean;
    logo: string;
    name: string;
    symbol: string;
}