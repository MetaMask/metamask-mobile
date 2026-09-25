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
  // `asset` and `url` are declared here but never read by the component, and
  // `origin` is only forwarded. They were effectively optional already: callers
  // (including every test) omit them. react-redux 9's stricter ownProps typing
  // surfaced the mismatch, so mark them optional rather than fabricate values.
  // TODO: remove `asset` and `url` if nothing actually needs them.
  asset?: SelectedAsset;
  origin?: string;
  sdkDappMetadata?: {
    url: string;
    icon: string;
  };
  url?: string;
}
