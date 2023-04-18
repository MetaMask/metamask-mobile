export interface SFSendToProps {
    accounts: object;
    navigation: any;
    newAssetTransaction: () => void;
    selectedAddress: string;
    identities: object;
    ticker: string;
    setRecipient: () => void;
    setSelectedAsset: () => void;
    showAlert: () => void;
    providerType: string;
    route: object;
    isPaymentRequest: boolean;
    addRecent: () => void;
    frequentRpcList: object;
    addressBook: object;
    chainId: string;
    network: string;
}