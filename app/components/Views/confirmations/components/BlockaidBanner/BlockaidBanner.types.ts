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
  reason: Reason;
  features?: (string | Record<string, string>)[];
  result_type: ResultType;
  providerRequestsCount?: Record<string, number>;
  block?: number;
  chainId?: string;
  req?: Record<string, unknown>;
}

type BlockaidBannerAllProps = BannerAlertProps & {
  securityAlertResponse?: SecurityAlertResponse;
  onToggleShowDetails?: () => void;
  onContactUsClicked?: () => void;
};

export type BlockaidBannerProps = Omit<BlockaidBannerAllProps, 'severity'>;

/**
 * Style sheet input parameters.
 */
export type BlockaidBannerStyleSheetVars = Pick<BlockaidBannerProps, 'style'>;
