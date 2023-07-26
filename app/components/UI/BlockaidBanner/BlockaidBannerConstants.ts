export const ATTRIBUTION_LINE_TEST_ID = 'blockaid-banner-attribution-line';

import { AttackType } from './BlockaidBanner.types';

export const REASON_DESCRIPTION_I18N_KEY_MAP = Object.freeze({
  [AttackType.approvalFarming]: 'blockaid_banner.approval_farming_description',
  [AttackType.blurFarming]: 'blockaid_banner.blur_farming_description',
  [AttackType.maliciousDomain]: 'blockaid_banner.malicious_domain_description',
  [AttackType.other]: 'blockaid_banner.other_description',
  [AttackType.permitFarming]: 'blockaid_banner.approval_farming_description',
  [AttackType.rawNativeTokenTransfer]:
    'blockaid_banner.transfer_farming_description',
  [AttackType.rawSignatureFarming]:
    'blockaid_banner.raw_signature_farming_description',
  [AttackType.seaportFarming]: 'blockaid_banner.seaport_farming_description',
  [AttackType.setApprovalForAllFarming]:
    'blockaid_banner.approval_farming_description',
  [AttackType.tradeOrderFarming]:
    'blockaid_banner.trade_order_farming_description',
  [AttackType.transferFarming]: 'blockaid_banner.transfer_farming_description',
  [AttackType.transferFromFarming]:
    'blockaid_banner.transfer_farming_description',
  [AttackType.unfairTrade]: 'blockaid_banner.unfair_trade_description',
});

export const SUSPICIOUS_TITLED_REQUESTS = [AttackType.rawSignatureFarming];
