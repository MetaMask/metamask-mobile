import type { HomeSectionMode } from '../../types';
import type { HomeSectionName } from '../../hooks/useHomeViewedEvent';
import type { HomepageUnrealizedPnlTone } from '../../components/HomepageSectionUnrealizedPnlRow';

export type PredictionsTrendingHeaderTestId =
  | 'trending-predictions'
  | 'predictions';

export interface PredictionsSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
  /** @default 'default' */
  mode?: HomeSectionMode;
  /** Override the section name used in analytics events. */
  sectionName?: HomeSectionName;
  /** Override the section header title. */
  titleOverride?: string;
}

export interface PredictHomepageUnrealizedPnlRowState {
  show: boolean;
  isLoading: boolean;
  valueText?: string;
  tone: HomepageUnrealizedPnlTone;
}
