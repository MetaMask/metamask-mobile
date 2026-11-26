import { useQuery } from '@tanstack/react-query';
import { strings } from '../../../../../locales/i18n';
import { useFormatters } from '../../../hooks/useFormatters';
import { collectiblesEpicOddsOptions } from '../queries/epicOdds';
import type { EpicOddsPack } from '../types/packs';
import { getEpicGaugeValue, rankEpicOddsPacks } from '../utils/epicOdds';

export function useEpicOddsPacks() {
  const { formatCurrency, formatNumber } = useFormatters();
  const { data, isPending } = useQuery(collectiblesEpicOddsOptions);

  const packs: EpicOddsPack[] = rankEpicOddsPacks(data ?? []).map((pack) => ({
    code: pack.code,
    name: pack.name,
    openedCount: pack.openedCount,
    priceLabel: formatCurrency(pack.priceUsd, 'USD'),
    subtitle: strings('collectibles.epic_vs_odds.pulls_line', {
      count: pack.pullsSinceEpic,
      formattedCount: formatNumber(pack.pullsSinceEpic),
      odds: formatNumber(pack.epicOdds, {
        style: 'percent',
        maximumFractionDigits: 2,
      }),
    }),
    gaugeValue: getEpicGaugeValue(pack),
  }));

  return { packs, isPending };
}
