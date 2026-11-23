import type { HomeSectionMode } from '../../../Views/Homepage/types';
import type { HomepageUnrealizedPnlTone } from '../../../Views/Homepage/components/HomepageSectionUnrealizedPnlRow';

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
