export const FALSE_POSITIVE_REPOST_LINE_TEST_ID =
  'blockaid-banner-false-positive-report-line';

import { Reason } from './BlockaidBanner.types';

export const REASON_DESCRIPTION_I18N_KEY_MAP: { [Reason: string]: string } =
  Object.freeze({
    [Reason.approvalFarming]: 'blockaid_banner.approval_farming_description',
    [Reason.blurFarming]: 'blockaid_banner.blur_farming_description',
    [Reason.maliciousDomain]: 'blockaid_banner.malicious_domain_description',
    [Reason.failed]: 'blockaid_banner.failed_description',
    [Reason.other]: 'blockaid_banner.other_description',
    [Reason.permitFarming]: 'blockaid_banner.approval_farming_description',
    [Reason.rawNativeTokenTransfer]:
      'blockaid_banner.transfer_farming_description',
    [Reason.rawSignatureFarming]:
      'blockaid_banner.raw_signature_farming_description',
    [Reason.seaportFarming]: 'blockaid_banner.seaport_farming_description',
    [Reason.setApprovalForAllFarming]:
      'blockaid_banner.approval_farming_description',
    [Reason.tradeOrderFarming]:
      'blockaid_banner.trade_order_farming_description',
    [Reason.transferFarming]: 'blockaid_banner.transfer_farming_description',
    [Reason.transferFromFarming]:
      'blockaid_banner.transfer_farming_description',
    [Reason.notApplicable]: 'blockaid_banner.not_applicable',
  });

export const REASON_TITLE_I18N_KEY_MAP: Record<string, string> = Object.freeze({
  [Reason.rawSignatureFarming]: 'blockaid_banner.suspicious_request_title',
  [Reason.failed]: 'blockaid_banner.failed_title',
});
