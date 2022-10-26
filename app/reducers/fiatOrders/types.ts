export interface CustomIdData {
  id: string;
  chainId: string;
  account: string;
  createdAt: number;
  lastTimeFetched: number;
  errorCount: number;
  expired?: boolean;
  order?: Record<string, any>;
}
