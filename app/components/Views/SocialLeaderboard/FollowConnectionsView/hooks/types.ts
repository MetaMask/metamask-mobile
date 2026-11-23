export interface FollowerConnection {
  id: string;
  username: string;
  /** Wallet address used for the Maskicon fallback. Never rendered as text. */
  address: string;
  avatarUri?: string;
}
