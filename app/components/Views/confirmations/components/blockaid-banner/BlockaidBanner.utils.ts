import { strings } from '../../../../../../locales/i18n';
import {
  BLOCKAID_APPROVAL_REASONS,
  DEFAULT_DESCRIPTION_I18N_KEY,
  DEFAULT_TITLE_I18N_KEY,
  REASON_DESCRIPTION_I18N_KEY_MAP,
  REASON_DESCRIPTION_WITH_AMOUNT_I18N_KEY_MAP,
  REASON_MARKETPLACE_NAME_MAP,
  REASON_REQUEST_TYPE_I18N_KEY_MAP,
  REASON_TITLE_I18N_KEY_MAP,
} from './BlockaidBanner.constants';
import { Reason } from './BlockaidBanner.types';

/**
 * Returns the localized banner title for a security alert reason.
 *
 * @param reason - The security alert reason reported by the provider.
 */
export function getBlockaidBannerTitle(reason: Reason): string {
  return strings(REASON_TITLE_I18N_KEY_MAP[reason] ?? DEFAULT_TITLE_I18N_KEY);
}

/**
 * Returns the localized banner description for a security alert reason,
 * injecting the marketplace name or the fiat amount at risk when the matching
 * string supports it.
 *
 * @param reason - The security alert reason reported by the provider.
 * @param amount - Formatted fiat total of outgoing assets, if available.
 */
export function getBlockaidBannerDescription(
  reason: Reason,
  amount?: string | null,
): string {
  const marketplace = REASON_MARKETPLACE_NAME_MAP[reason];

  if (marketplace) {
    return strings(REASON_DESCRIPTION_I18N_KEY_MAP[reason], { marketplace });
  }

  const descriptionWithAmountKey =
    REASON_DESCRIPTION_WITH_AMOUNT_I18N_KEY_MAP[reason];

  if (amount && descriptionWithAmountKey) {
    return strings(descriptionWithAmountKey, { amount });
  }

  return strings(
    REASON_DESCRIPTION_I18N_KEY_MAP[reason] ?? DEFAULT_DESCRIPTION_I18N_KEY,
  );
}

/**
 * Amount injected into the confirm-anyway modal. Approval reasons use the
 * spending-cap fiat total so a gas-only simulation cannot understate the
 * allowance being granted. Other reasons use simulated outgoing assets.
 *
 * @param reason - The security alert reason reported by the provider.
 * @param sendingFiatTotal - Formatted fiat total of outgoing simulated assets.
 * @param approvedAmountFiat - Formatted fiat total of the spending cap.
 */
export function getBlockaidModalAmount(
  reason: Reason,
  sendingFiatTotal?: string | null,
  approvedAmountFiat?: string | null,
): string | null {
  if (BLOCKAID_APPROVAL_REASONS.has(reason)) {
    return approvedAmountFiat ?? null;
  }

  return sendingFiatTotal ?? null;
}

/**
 * Returns the localized confirm-anyway modal message for a security alert
 * reason. The reason selects a request-type noun ("approval", "transfer",
 * "signature", "request") that is composed into a single message.
 *
 * @param reason - The security alert reason reported by the provider.
 * @param amount - Formatted fiat amount at risk, if available.
 */
export function getBlockaidConfirmModalMessage(
  reason: Reason,
  amount?: string | null,
): string {
  const requestType = strings(
    REASON_REQUEST_TYPE_I18N_KEY_MAP[reason] ??
      'blockaid_banner.request_type.request',
  );

  if (amount) {
    return strings('alert_system.confirm_modal.blockaid_message_with_amount', {
      requestType,
      amount,
    });
  }

  return strings('alert_system.confirm_modal.blockaid_message', {
    requestType,
  });
}
