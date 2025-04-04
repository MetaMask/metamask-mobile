import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';

interface Alert {
  alertError: string;
  alertSeverity: BannerAlertSeverity;
  alertOrigin: string;
}
export interface CustomNetworkInformation {
  chainName: string;
  chainId: string;
  rpcUrl: string;
  ticker: string;
  blockExplorerUrl: string;
  alerts: Alert[];
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
}
