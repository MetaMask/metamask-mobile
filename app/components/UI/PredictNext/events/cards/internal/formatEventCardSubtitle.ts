import I18n, { strings } from '../../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import type { PredictEvent } from '../../../types';
import { formatVolume } from '../../shared/formatting';

const CLOSE_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  year: 'numeric',
};

const SEPARATOR = ' · ';

const formatCloseDate = (closesAt?: string): string | undefined => {
  if (!closesAt) {
    return undefined;
  }

  const date = new Date(closesAt);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return strings('predict_next.event.card_closes', {
    date: getIntlDateTimeFormatter(I18n.locale, CLOSE_DATE_OPTIONS).format(
      date,
    ),
  });
};

/**
 * The feed card's line under the title: close date, then volume, as in
 * "Closes Jul 2028 · $4.2M". A missing part is left out; undefined when both
 * are missing.
 */
export const formatEventCardSubtitle = ({
  closesAt,
  volume,
}: Pick<PredictEvent, 'closesAt' | 'volume'>): string | undefined => {
  const formattedVolume = formatVolume(volume);
  const parts = [
    formatCloseDate(closesAt),
    formattedVolume === undefined
      ? undefined
      : strings('predict_next.event.card_volume', { volume: formattedVolume }),
  ].filter((part): part is string => part !== undefined);

  return parts.length > 0 ? parts.join(SEPARATOR) : undefined;
};
