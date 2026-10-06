import { TagSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  CollectorCryptCard,
  CollectorCryptRarity,
} from '../../providers/collector-crypt/types';

export const RARITY_TAG_SEVERITY: Record<CollectorCryptRarity, TagSeverity> = {
  common: TagSeverity.Neutral,
  uncommon: TagSeverity.Info,
  rare: TagSeverity.Warning,
  epic: TagSeverity.Success,
};

/** Localized rarity name. */
export const getRarityLabel = (rarity: CollectorCryptRarity): string =>
  strings(`gacha.rarity.${rarity}`);

/** "PSA GEM-MT 10", or undefined when the card has no grade. */
export const getGradeLabel = (
  card: Pick<CollectorCryptCard, 'grade' | 'gradingCompany'>,
): string | undefined => {
  const label = [card.gradingCompany, card.grade]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');
  return label || undefined;
};
