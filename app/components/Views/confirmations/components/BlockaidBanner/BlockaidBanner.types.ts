import { BannerAlertProps } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';

export enum Reason {
  approvalFarming = 'approval_farming',
  blurFarming = 'blur_farming',
  maliciousDomain = 'malicious_domain',
  other = 'other',
  permitFarming = 'permit_farming',
  rawNativeTokenTransfer = 'raw_native_token_transfer',
  rawSignatureFarming = 'raw_signature_farming',
  seaportFarming = 'seaport_farming',
  setApprovalForAllFarming = 'set_approval_for_all_farming',
  tradeOrderFarming = 'trade_order_farming',
  transferFarming = 'transfer_farming',
  transferFromFarming = 'transfer_from_farming',

  // MetaMask defined reasons
  failed = 'failed',
  notApplicable = 'not_applicable',
  requestInProgress = 'request_in_progress',
}

export enum ResultType {
  Benign = 'Benign',
  Malicious = 'Malicious',
  Warning = 'Warning',

  // MetaMask defined result types
  Failed = 'Failed',
  RequestInProgress = 'RequestInProgress',
}

export interface SecurityAlertResponse {
  block?: number;
  chainId?: string;
  features?: (string | Record<string, string>)[];
  providerRequestsCount?: Record<string, number>;
  reason: Reason;
  req?: Record<string, unknown>;
  result_type: ResultType;
  source?: SecurityAlertSource;
}

type BlockaidBannerAllProps = BannerAlertProps & {
  securityAlertResponse?: SecurityAlertResponse;
  onToggleShowDetails?: () => void;
  onContactUsClicked?: () => Promise<void>;
};

export type BlockaidBannerProps = Omit<BlockaidBannerAllProps, 'severity'>;

/**
 * Style sheet input parameters.
 */
export type BlockaidBannerStyleSheetVars = Pick<BlockaidBannerProps, 'style'>;

export enum SecurityAlertSource {
  /** Validation performed remotely using the Security Alerts API. */
  API = 'api',

  /** Validation performed locally using the PPOM. */
  Local = 'local',
}
