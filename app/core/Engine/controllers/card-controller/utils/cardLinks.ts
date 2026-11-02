import type { CardLink } from '../types';

export const latestByUpdatedAt = (links: CardLink[]): CardLink | null =>
  links.reduce<CardLink | null>(
    (best, link) =>
      best === null || link.updatedAt > best.updatedAt ? link : best,
    null,
  );
