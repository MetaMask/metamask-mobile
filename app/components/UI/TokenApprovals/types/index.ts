export enum Verdict {
  Malicious = 'Malicious',
  Warning = 'Warning',
  Benign = 'Benign',
}

export enum ApprovalAssetType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export interface SpenderFeature {
  id: string;
  description: string;
}

export interface ApprovalSpender {
  address: string;
  label?: string;
  is_contract: boolean;
  features: SpenderFeature[];
  verdict: Verdict;
  exposure_usd?: number;
}

export interface ApprovalAsset {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo_url?: string;
  type: ApprovalAssetType;
}

export interface ApprovalAllowance {
  amount: string;
  is_unlimited: boolean;
}

export interface ApprovalItem {
  id: string;
  chainId: string;
  chainName: string;
  asset: ApprovalAsset;
  spender: ApprovalSpender;
  allowance: ApprovalAllowance;
  verdict: Verdict;
  exposure_usd: number;
  last_updated?: string;
}

export interface BlockaidApprovalResponse {
  approvals: BlockaidRawApproval[];
}

export interface BlockaidRawApproval {
  asset: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logo_url?: string;
    type: string;
  };
  spenders: {
    address: string;
    label?: string;
    is_contract: boolean;
    features: {
      id: string;
      description: string;
    }[];
    approval: {
      amount: string;
      is_unlimited: boolean;
    };
    verdict: string;
    exposure_usd?: number;
  }[];
}

export type VerdictFilter = 'All' | Verdict;
export type SortOption = 'risk' | 'value' | 'asset_name';

export interface RevocationStatus {
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  transactionHash?: string;
  error?: string;
}

export interface TokenApprovalsState {
  approvals: ApprovalItem[];
  isLoading: boolean;
  error: string | null;
  chainErrors: Record<string, string>;
  selectedChains: string[];
  verdictFilter: VerdictFilter;
  sortBy: SortOption;
  searchQuery: string;
  selectedApprovalIds: string[];
  revocations: Record<string, RevocationStatus>;
  hasSeenEducation: boolean;
}
