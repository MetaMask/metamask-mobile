import React, { type PropsWithChildren } from 'react';
import type { IconName as DSIconName } from '@metamask/design-system-react-native';
import type { IconName as LocalIconName } from '../../../../component-library/components/Icons/Icon/Icon.types';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

export type SectionId =
  | 'predictions'
  | 'sports_predictions'
  | 'crypto_predictions'
  | 'politics_predictions'
  | 'tokens'
  | 'crypto_movers'
  | 'perps'
  | 'rwa_perps'
  | 'macro_stocks_commodity_perps'
  | 'crypto_perps'
  | 'stocks'
  | 'sites'
  | 'dapps_recents';

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
  /** Returns a stable identifier for an item (e.g. assetId, symbol, url) used in analytics */
  getItemIdentifier: (item: unknown) => string;
  RowItem: React.ComponentType<RowItemProps>;
  OverrideRowItemSearch?: React.ComponentType<RowItemSearchProps>;
  /** Batches any per-tile subscriptions (sparklines, watchlist) for the slice of items shown in the carousel. */
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
