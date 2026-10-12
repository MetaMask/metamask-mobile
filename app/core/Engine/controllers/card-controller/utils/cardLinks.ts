import type { CardProviderId } from '../provider-types';
import type { CardLink } from '../types';

export const pickRoutableCardLink = (
  links: CardLink[] | null | undefined,
): CardLink | null =>
  links?.find((link) => link.status === 'active') ??
  links?.find((link) => link.status === 'onboarding') ??
  null;

export interface CardEntryRouting {
  hasCard: boolean;
  provider: CardProviderId | null;
  source: 'card_links' | 'legacy';
  disagreesWithLegacy: boolean;
}

/**
 * Stored links decide once the API returned any; the legacy `card_user` label
 * decides when it returned none, or when the flag is off.
 */
export const resolveCardEntryRouting = ({
  cardLinkApiEnabled,
  cardLinks,
  hasLegacyCardholder,
}: {
  cardLinkApiEnabled: boolean;
  cardLinks: CardLink[] | null;
  hasLegacyCardholder: boolean;
}): CardEntryRouting => {
  if (!cardLinkApiEnabled || cardLinks === null) {
    return {
      hasCard: hasLegacyCardholder,
      provider: null,
      source: 'legacy',
      disagreesWithLegacy: false,
    };
  }

  const link = pickRoutableCardLink(cardLinks);
  const linksSayCard = link !== null;

  if (cardLinks.length === 0) {
    return {
      hasCard: hasLegacyCardholder,
      provider: null,
      source: 'legacy',
      disagreesWithLegacy: hasLegacyCardholder,
    };
  }

  return {
    hasCard: linksSayCard,
    provider: link?.provider ?? null,
    source: 'card_links',
    disagreesWithLegacy: linksSayCard !== hasLegacyCardholder,
  };
};
