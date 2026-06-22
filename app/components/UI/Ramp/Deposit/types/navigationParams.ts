import { RampIntent } from '../../Aggregator/types';
import type { DepositDevPreviewTarget } from '../dev/depositStackPreviewConfig';

export type DepositNavigationParams = RampIntent & {
  shouldRouteImmediately?: boolean;
  devPreviewTarget?: DepositDevPreviewTarget;
};
