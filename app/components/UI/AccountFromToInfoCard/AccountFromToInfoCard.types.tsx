interface Account {
  balance: number;
}

type Accounts = Record<string, Account>;

interface Identity {
  address: string;
  name: string;
}

type Identities = Record<string, Identity>;

interface SelectedAsset {
  isETH: boolean;
  tokenId?: string;
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
  name?: string;
}

export interface Transaction {
  transaction: { from: string; to: string; data?: string };
  transactionTo: string;
  transactionToName: string;
  transactionFromName: string;
  selectedAsset: SelectedAsset;
  ensRecipient?: string;
}

export interface AccountFromToInfoCardProps {
  accounts: Accounts;
  addressBook: Record<string, Record<string, string>>;
  contractBalances: Record<string, number>;
  identities: Identities;
  network: string;
  onPressFromAddressIcon?: () => void;
  ticker?: string;
  transactionState: Transaction;
  layout?: string;
}
