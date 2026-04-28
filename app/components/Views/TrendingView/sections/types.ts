import React, { type PropsWithChildren } from 'react';
import type { IconName as DSIconName } from '@metamask/design-system-react-native';
import type { IconName as LocalIconName } from '../../../../component-library/components/Icons/Icon/Icon.types';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

/**
 * Single source of truth for every section id that ships in the Explore page.
 * Adding a section: append the literal here and the rest of the type system
 * (and tests that iterate over this list) catches up automatically.
 */
export const ALL_SECTION_IDS = [
  'predictions',
  'sports_predictions',
  'crypto_predictions',
  'politics_predictions',
  'tokens',
  'crypto_movers',
  'perps',
  'rwa_perps',
  'macro_stocks_commodity_perps',
  'crypto_perps',
  'stocks',
  'sites',
  'dapps_recents',
  'dapps_favorites',
  'dapps_networks',
  'all_sports',
] as const;

export type SectionId = (typeof ALL_SECTION_IDS)[number];

export type SectionIcon =
  | { source: 'local'; name: LocalIconName }
  | { source: 'design-system'; name: DSIconName };

export interface SectionData {
  data: unknown[];
  isLoading: boolean;
}

export interface RowItemProps {
  item: unknown;
  index: number;
  navigation: AppNavigationProp;
  extra?: unknown;
}

export interface RowItemSearchProps {
  item: unknown;
  index?: number;
  navigation: AppNavigationProp;
}

export interface SectionConfig {
  id: SectionId;
  title: string;
  /** Optional grey subtitle rendered below the section title. */
  subtitle?: string;
  icon: SectionIcon;
  viewAllAction: (navigation: AppNavigationProp) => void;
  /**
   * When false, the section title is not tappable and no trailing chevron is shown.
   * @default true
   */
  showViewAllInHeader?: boolean;
  /**
   * For {@link TileSection} only: when false, the trailing "view more" tile is omitted.
   * @default true
   */
  showViewMoreTile?: boolean;
  /**
   * When true, Section.tsx skips the empty-state check for this section.
   * Use for sections that manage their own data fetching internally.
   */
  omitEmptyStateCheck?: boolean;
  /** Returns a stable identifier for an item (e.g. assetId, symbol, url) used in analytics */
  getItemIdentifier: (item: unknown) => string;
  RowItem: React.ComponentType<RowItemProps>;
  OverrideRowItemSearch?: React.ComponentType<RowItemSearchProps>;
  /** Optional batched props passed as `extra` (e.g. perps tiles: sparklines + watchlist). */
  useTileExtra?: (items: unknown[]) => unknown;
  Skeleton: React.ComponentType;
  OverrideSkeletonSearch?: React.ComponentType;
  Section: React.ComponentType<{
    sectionId: SectionId;
    data: unknown[];
    isLoading: boolean;
  }>;
  useSectionData: (searchQuery?: string) => {
    data: unknown[];
    isLoading: boolean;
    refetch: () => Promise<void> | void;
  };
  SectionWrapper?: React.ComponentType<PropsWithChildren>;
}

/** Explore tab identifiers — single source of truth (also imported by ExploreTabPanels). */
export type ExploreTabId =
  | 'now'
  | 'macro'
  | 'rwas'
  | 'crypto'
  | 'sports'
  | 'dapps';
