import { RampIntent } from '../../Aggregator/types';
import type { DepositDevPreviewTarget } from '../dev/depositStackPreviewConfig';

export type DepositNavigationParams = RampIntent & {
  shouldRouteImmediately?: boolean;
  /** Skip Root bootstrap and open a specific deposit screen (local preview). */
  devPreviewTarget?: DepositDevPreviewTarget;
};
