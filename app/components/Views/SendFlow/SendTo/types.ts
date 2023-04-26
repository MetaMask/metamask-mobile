export interface SelectedAssetProp {
  address: string;
  isETH: boolean;
  logo: string;
  name: string;
  symbol: string;
}

export interface STAddressToProps {
  inputRef: any;
  highlighted: boolean;
  addressToReady: boolean;
  toSelectedAddress: any;
  toSelectedAddressName: any;
  onSubmit: (address: string) => void;
  inputWidth: any;
  confusableCollectionArray: any;
  isFromAddressBook: any;
  updateParentState: any;
  onToSelectedAddressChange: any;
}
