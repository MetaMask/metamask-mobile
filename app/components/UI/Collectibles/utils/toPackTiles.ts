import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { flameCounterThreshold, homePackLimit } from '../constants';
import type { HomePack } from '../types/packs';

function isShowable(pack: HomePack): pack is HomePack & { priceUsd: number } {
  return pack.isAvailable && pack.priceUsd !== null;
}

function toPackTile(pack: HomePack & { priceUsd: number }) {
  return {
    code: pack.code,
    name: pack.name,
    priceLabel: getIntlNumberFormatter(I18n.locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(pack.priceUsd),
    counterLabel: getIntlNumberFormatter(I18n.locale).format(
      pack.openedLast7Days,
    ),
    showFlame: pack.openedLast7Days >= flameCounterThreshold,
    socialCue: pack.socialCue,
  };
}

/** Drops closed or unpriced packs and keeps the first homePackLimit. */
export function toPackTiles(packs: HomePack[]) {
  return packs.filter(isShowable).slice(0, homePackLimit).map(toPackTile);
}
