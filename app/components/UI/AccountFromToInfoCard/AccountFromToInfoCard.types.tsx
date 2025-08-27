import { InternalAccount } from '@metamask/keyring-internal-api';

interface SelectedAsset {
  isETH: boolean;
  tokenId?: string;
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
  name?: string;
  standard?: string;
}

export interface Transaction {
  transaction: { from: string; to: string; data?: string };
  transactionTo: string;
  transactionToName: string;
  transactionFromName: string;
  selectedAsset: SelectedAsset;
  ensRecipient?: string;
  chainId?: string;
}

export interface AccountFromToInfoCardProps {
  internalAccounts: InternalAccount[];
  chainId: string;
  onPressFromAddressIcon?: () => void;
  ticker?: string;
  transactionState: Transaction;
  layout?: string;
  asset: SelectedAsset;
  origin: string;
  sdkDappMetadata?: {
    url: string;
    icon: string;
  };
  url: string;
}
