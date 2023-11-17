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
  icon: any;
}
