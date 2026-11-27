import { useQuery } from '@tanstack/react-query';
import { strings } from '../../../../../locales/i18n';
import { useFormatters } from '../../../hooks/useFormatters';
import { collectiblesEpicOddsOptions } from '../queries/epicOdds';
import type { EpicHuntPack } from '../types/packs';
import { getPullsOverAverage, rankEpicOddsPacks } from '../utils/epicOdds';

export function useEpicHuntPacks() {
  const { formatNumber } = useFormatters();
  const { data: machines, isPending } = useQuery(collectiblesEpicOddsOptions);

  const data: EpicHuntPack[] = rankEpicOddsPacks(machines ?? []).map(
    (pack) => ({
      code: pack.code,
      name: pack.name,
      openedCount: pack.openedCount,
      priceUsd: pack.priceUsd,
      subtitle: strings('collectibles.epic_hunt.pulls_line', {
        count: pack.pullsSinceEpic,
        formattedCount: formatNumber(pack.pullsSinceEpic),
        odds: formatNumber(pack.epicOdds, {
          style: 'percent',
          maximumFractionDigits: 2,
        }),
      }),
      pullsOverAverage: getPullsOverAverage(pack),
    }),
  );

  return { data, isPending };
}
