export enum QRTabSwitcherScreens {
  Scanner,
  Receive,
}

export interface ScanSuccess {
  content?: string;
  chain_id?: string;
  seed?: string;
  private_key?: string;
  target_address?: string;
  action?: 'send-eth';
  walletConnectURI?: string;
}

export interface StartScan {
  content?: string;
  seed?: string;
  private_key?: string;
  target_address?: string;
  action?: 'send-eth';
  walletConnectURI?: string;
}

export interface QRTabSwitcherParams {
  onScanSuccess?: (data: ScanSuccess, content?: string) => void;
  onStartScan?: (data: StartScan) => Promise<void>;
  onScanError?: (error: string) => void;
  initialScreen?: QRTabSwitcherScreens;
  disableTabber?: boolean;
  origin?: string;
  networkName?: string;
}
