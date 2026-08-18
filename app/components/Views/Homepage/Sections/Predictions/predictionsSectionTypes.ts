import type { HomeSectionMode } from '../../types';
import type { HomepageUnrealizedPnlTone } from '../../components/HomepageSectionUnrealizedPnlRow';

export type PredictionsTrendingHeaderTestId = 'predictions';

export interface PredictionsSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
  /** @default 'default' */
  mode?: HomeSectionMode;
}

export interface PredictHomepageUnrealizedPnlRowState {
  show: boolean;
  isLoading: boolean;
  valueText?: string;
  tone: HomepageUnrealizedPnlTone;
}
