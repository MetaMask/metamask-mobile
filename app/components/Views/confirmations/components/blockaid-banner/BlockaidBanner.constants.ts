export const FALSE_POSITIVE_REPOST_LINE_TEST_ID =
  'blockaid-banner-false-positive-report-line';

import { Reason } from './BlockaidBanner.types';

/** Title and description shown for reasons with no explicit mapping. */
export const DEFAULT_TITLE_I18N_KEY =
  'blockaid_banner.risk_signals_detected_title';
export const DEFAULT_DESCRIPTION_I18N_KEY = 'blockaid_banner.other_description';

/** Reason to description translation key mapping. Grouped by translation. */
export const REASON_DESCRIPTION_I18N_KEY_MAP: { [Reason: string]: string } =
  Object.freeze({
    [Reason.approvalFarming]: 'blockaid_banner.approval_farming_description',
    [Reason.permitFarming]: 'blockaid_banner.approval_farming_description',
    [Reason.setApprovalForAllFarming]:
      'blockaid_banner.approval_farming_description',

    [Reason.blurFarming]: 'blockaid_banner.marketplace_farming_description',
    [Reason.seaportFarming]: 'blockaid_banner.marketplace_farming_description',

    [Reason.failed]: 'blockaid_banner.failed_description',

    [Reason.maliciousDomain]: 'blockaid_banner.malicious_domain_description',

    [Reason.rawSignatureFarming]:
      'blockaid_banner.high_risk_signature_description',
    [Reason.tradeOrderFarming]:
      'blockaid_banner.high_risk_signature_description',

    [Reason.rawNativeTokenTransfer]:
      'blockaid_banner.transfer_farming_description',
    [Reason.transferFarming]: 'blockaid_banner.transfer_farming_description',
    [Reason.transferFromFarming]:
      'blockaid_banner.transfer_farming_description',

    [Reason.other]: DEFAULT_DESCRIPTION_I18N_KEY,
  });

/**
 * Amount-bearing variants of the banner descriptions, used when a formatted
 * fiat total of outgoing assets is available. The amount is injected as
 * {{amount}}.
 */
export const REASON_DESCRIPTION_WITH_AMOUNT_I18N_KEY_MAP: {
  [Reason: string]: string;
} = Object.freeze({
  [Reason.maliciousDomain]:
    'blockaid_banner.malicious_domain_description_with_amount',

  [Reason.rawNativeTokenTransfer]:
    'blockaid_banner.transfer_farming_description_with_amount',
  [Reason.transferFarming]:
    'blockaid_banner.transfer_farming_description_with_amount',
  [Reason.transferFromFarming]:
    'blockaid_banner.transfer_farming_description_with_amount',
});

/**
 * Marketplace display names injected into marketplace_farming_description as
 * {{marketplace}}. Product names are not localized.
 */
export const REASON_MARKETPLACE_NAME_MAP: { [Reason: string]: string } =
  Object.freeze({
    [Reason.blurFarming]: 'Blur',
    [Reason.seaportFarming]: 'OpenSea',
  });

/** Reason to title translation key mapping. */
export const REASON_TITLE_I18N_KEY_MAP: Record<string, string> = Object.freeze({
  [Reason.approvalFarming]: 'blockaid_banner.high_risk_approval_title',
  [Reason.permitFarming]: 'blockaid_banner.high_risk_approval_title',
  [Reason.setApprovalForAllFarming]: 'blockaid_banner.high_risk_approval_title',

  [Reason.blurFarming]: 'blockaid_banner.high_risk_approval_title',
  [Reason.seaportFarming]: 'blockaid_banner.high_risk_approval_title',

  [Reason.failed]: 'blockaid_banner.failed_title',

  [Reason.maliciousDomain]: 'blockaid_banner.site_flagged_unsafe_title',

  [Reason.rawSignatureFarming]: 'blockaid_banner.high_risk_signature_title',
  [Reason.tradeOrderFarming]: 'blockaid_banner.high_risk_signature_title',

  [Reason.rawNativeTokenTransfer]: 'blockaid_banner.high_risk_transfer_title',
  [Reason.transferFarming]: 'blockaid_banner.high_risk_transfer_title',
  [Reason.transferFromFarming]: 'blockaid_banner.high_risk_transfer_title',

  [Reason.other]: DEFAULT_TITLE_I18N_KEY,
});

/**
 * Reason to request-type noun translation key mapping. The noun is composed
 * into the confirm-anyway modal message ("...high-risk signals in this
 * approval").
 */
export const REASON_REQUEST_TYPE_I18N_KEY_MAP: Record<string, string> =
  Object.freeze({
    [Reason.approvalFarming]: 'blockaid_banner.request_type.approval',
    [Reason.permitFarming]: 'blockaid_banner.request_type.approval',
    [Reason.setApprovalForAllFarming]: 'blockaid_banner.request_type.approval',
    [Reason.blurFarming]: 'blockaid_banner.request_type.approval',
    [Reason.seaportFarming]: 'blockaid_banner.request_type.approval',

    [Reason.rawSignatureFarming]: 'blockaid_banner.request_type.signature',
    [Reason.tradeOrderFarming]: 'blockaid_banner.request_type.signature',

    [Reason.rawNativeTokenTransfer]: 'blockaid_banner.request_type.transfer',
    [Reason.transferFarming]: 'blockaid_banner.request_type.transfer',
    [Reason.transferFromFarming]: 'blockaid_banner.request_type.transfer',

    [Reason.maliciousDomain]: 'blockaid_banner.request_type.request',
    [Reason.other]: 'blockaid_banner.request_type.request',
  });

/**
 * Reasons whose confirm-anyway modal should use the spending-cap fiat amount
 * rather than simulated outgoing assets. Marketplace listings are included
 * because they share the approval request-type noun.
 */
export const BLOCKAID_APPROVAL_REASONS: ReadonlySet<Reason> = new Set([
  Reason.approvalFarming,
  Reason.permitFarming,
  Reason.setApprovalForAllFarming,
  Reason.blurFarming,
  Reason.seaportFarming,
]);
