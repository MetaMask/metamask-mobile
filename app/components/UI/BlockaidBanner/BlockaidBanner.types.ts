import { BannerAlertProps } from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';

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
  unfairTrade = 'unfair_trade',
}

export enum FlagType {
  benign = 'benign',
  malicious = 'malicious',
  warning = 'warning',
}

type BlockaidBannerAllProps = BannerAlertProps & {
  reason: Reason;
  features: string[];
  flagType: FlagType;
  onToggleShowDetails?: () => void;
};

export type BlockaidBannerProps = Omit<BlockaidBannerAllProps, 'severity'>;

/**
 * Style sheet input parameters.
 */
export type BlockaidBannerStyleSheetVars = Pick<BlockaidBannerProps, 'style'>;
