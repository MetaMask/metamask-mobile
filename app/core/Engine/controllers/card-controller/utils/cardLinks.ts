import type { CardLink } from '../types';

export const latestByUpdatedAt = (links: CardLink[]): CardLink | null =>
  links.reduce<CardLink | null>(
    (best, link) =>
      best === null || link.updatedAt > best.updatedAt ? link : best,
    null,
  );

/** `active` wins over `onboarding`; `closed` rows are ignored; ties go to the newest row. */
export const pickRoutableCardLink = (
  links: CardLink[] | null | undefined,
): CardLink | null =>
  latestByUpdatedAt(links?.filter((l) => l.status === 'active') ?? []) ??
  latestByUpdatedAt(links?.filter((l) => l.status === 'onboarding') ?? []);
