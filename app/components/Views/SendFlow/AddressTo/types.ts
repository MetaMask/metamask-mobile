export interface SFAddressToProps {
    inputRef: any;
     highlighted: boolean;
     addressToReady: boolean;
     toSelectedAddress: string;
     toAddressName: string;
     onSubmit: (address: string) => void;
     inputWidth: any;
     confusableCollection: [];
     isFromAddressBook: any;
     updateParentState: any;
}