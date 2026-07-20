import type { HomepageDiscoveryPillId } from './homepageDiscoveryPills.constants';

export const HomepageDiscoveryPillsTestIds = {
  CONTAINER: 'homepage-discovery-pills',
  pill: (pillId: HomepageDiscoveryPillId) =>
    `homepage-discovery-pill-${pillId}`,
} as const;
