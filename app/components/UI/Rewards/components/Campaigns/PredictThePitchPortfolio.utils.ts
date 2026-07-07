import type { PredictThePitchPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { formatRewardsDateLabel } from '../../utils/formatUtils';

export type GroupedPredictThePitchPositionItem =
  | { kind: 'date-header'; dateKey: string; label: string }
  | { kind: 'position'; position: PredictThePitchPositionDto; index: number };

/**
 * Inserts date section headers while walking a fillDate-sorted position list.
 * Mirrors the grouping pattern used in OndoCampaignPortfolioView activity rows.
 */
export function groupPositionsByDate(
  positions: PredictThePitchPositionDto[],
): GroupedPredictThePitchPositionItem[] {
  const items: GroupedPredictThePitchPositionItem[] = [];
  let lastDateKey = '';

  positions.forEach((position, index) => {
    const dateKey = position.fillDate.slice(0, 10);
    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      items.push({
        kind: 'date-header',
        dateKey,
        label: formatRewardsDateLabel(new Date(position.fillDate)),
      });
    }
    items.push({ kind: 'position', position, index });
  });

  return items;
}
