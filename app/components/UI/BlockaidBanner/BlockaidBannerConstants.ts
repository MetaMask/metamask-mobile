export const ATTRIBUTION_LINE_TEST_ID="blockaid-banner-attribution-line"

import { AttackType } from './BlockaidBanner.types';

export const AttackTypes: Record<string, AttackType> = Object.freeze({
  rawSignatureFarming: 'raw_signature_farming',
  approvalFarming: 'approval_farming',
  setApprovalForAllFarming: 'set_approval_for_all_farming',
  permitFarming: 'permit_farming',
  transferFarming: 'transfer_farming',
  transferFromFarming: 'transfer_from_farming',
  rawNativeTokenTransfer: 'raw_native_token_transfer',
  seaportFarming: 'seaport_farming',
  blurFarming: 'blur_farming',
  unfairTrade: 'unfair_trade',
  tradeOrderFarming: 'trade_order_farming',
  other: 'other',
  maliciousDomain: 'malicious_domain',
});

export const REASON_DESCRIPTION_I18N_KEY_MAP = Object.freeze({
  [AttackTypes.rawSignatureFarming]:
    'blockaid_banner.raw_signature_farming_description',
  [AttackTypes.approvalFarming]: 'blockaid_banner.approval_farming_description',
  [AttackTypes.setApprovalForAllFarming]:
    'blockaid_banner.approval_farming_description',
  [AttackTypes.permitFarming]: 'blockaid_banner.approval_farming_description',
  [AttackTypes.transferFarming]: 'blockaid_banner.transfer_farming_description',
  [AttackTypes.transferFromFarming]:
    'blockaid_banner.transfer_farming_description',
  [AttackTypes.rawNativeTokenTransfer]:
    'blockaid_banner.transfer_farming_description',
  [AttackTypes.seaportFarming]: 'blockaid_banner.seaport_farming_description',
  [AttackTypes.blurFarming]: 'blockaid_banner.blur_farming_description',
  [AttackTypes.unfairTrade]: 'blockaid_banner.unfair_trade_description',
  [AttackTypes.tradeOrderFarming]:
    'blockaid_banner.trade_order_farming_description',
  [AttackTypes.other]: 'blockaid_banner.other_description',
  [AttackTypes.maliciousDomain]: 'blockaid_banner.malicious_domain_description',
});

export const SUSPICIOUS_TITLED_REQUESTS = ['raw_signature_farming'];
