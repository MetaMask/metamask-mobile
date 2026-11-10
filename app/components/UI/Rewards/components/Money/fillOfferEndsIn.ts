import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { formatDuration } from '../../utils/formatUtils';

export type OfferEndsCopy = Pick<
  ReferralLocalizedText,
  | 'offerEndsIn'
  | 'offerDurationDay'
  | 'offerDurationDays'
  | 'offerDurationHour'
  | 'offerDurationHours'
>;

/**
 * Fills `{duration}` in `offerEndsIn` from the localized unit templates.
 * Null when the template or a future end is missing, so the hero hides the
 * line instead of showing a placeholder.
 */
export const fillOfferEndsIn = (
  localizedText: OfferEndsCopy | undefined,
  endIso: string | null | undefined,
  nowMs: number = Date.now(),
): string | null => {
  if (!localizedText?.offerEndsIn?.includes('{duration}')) {
    return null;
  }
  const duration = formatDuration(
    endIso,
    {
      day: localizedText.offerDurationDay,
      days: localizedText.offerDurationDays,
      hour: localizedText.offerDurationHour,
      hours: localizedText.offerDurationHours,
    },
    nowMs,
  );
  if (!duration) {
    return null;
  }
  return localizedText.offerEndsIn.replaceAll('{duration}', duration);
};
