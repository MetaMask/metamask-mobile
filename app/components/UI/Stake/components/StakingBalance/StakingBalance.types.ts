export interface ExitRequest {
  positionTicket: string; // BigInt!
  timestamp: string; // BigInt!
  totalShares: string; // BigInt!
  receiver: string; // Bytes!
  /**
   * If `withdrawalTimestamp` is null, it means the request hasn't been processed yet.
   * If `withdrawalTimestamp` is "0", funds are withdrawable.
   * Else, `withdrawalTimestamp` shows an approximate UTC timestamp of when funds will be withdrawable.
   * `withdrawalTimestamp` is updated every 6 hours.
   */
  withdrawalTimestamp: string | null; // BigInt
}

export type ExitRequestWithClaimedAssetInfo = Pick<
  ExitRequest,
  'positionTicket' | 'timestamp' | 'totalShares' | 'withdrawalTimestamp'
> & {
  exitQueueIndex: string;
  claimedAssets: string | null;
  leftShares: string | null;
};

interface StakeByAccount {
  account: string;
  lifetimeRewards: string;
  assets: string;
  exitRequests: ExitRequestWithClaimedAssetInfo[];
}

export interface GetStakesApiResponse {
  accounts: StakeByAccount[];
  exchangeRate: string;
}

export interface Vault {
  apy: string; //BigDecimal!
  capacity: string; //BigInt!
  displayName: string | null; //String
  feePercent: number; // Int!
  totalAssets: string; //BigInt!
  addressString: string; //String!
}

export interface GetVaultDataApiResponse
  extends Pick<Vault, 'apy' | 'capacity' | 'feePercent' | 'totalAssets'> {
  vaultAddress: string;
}

export interface UnstakingRequest extends ExitRequestWithClaimedAssetInfo {
  assetsToDisplay: string;
}
