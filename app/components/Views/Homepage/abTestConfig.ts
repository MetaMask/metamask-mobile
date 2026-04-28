export const HOMEPAGE_TRENDING_SECTIONS_AB_KEY =
  'homepageAbtestTrendingSections';

export enum HomepageTrendingSectionsVariant {
  Control = 'control',
  TrendingSections = 'trendingSections',
}

export const HOMEPAGE_TRENDING_SECTIONS_VARIANTS: Record<
  HomepageTrendingSectionsVariant,
  { separateTrending: boolean }
> = {
  [HomepageTrendingSectionsVariant.Control]: { separateTrending: false },
  [HomepageTrendingSectionsVariant.TrendingSections]: {
    separateTrending: true,
  },
};
