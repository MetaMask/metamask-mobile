import type { HomepageDiscoveryPillIconStyle } from '../../abTestConfig';
import type { HomepageDiscoveryPillId } from './homepageDiscoveryPills.constants';

export interface HomepageDiscoveryPillsProps {
  iconStyle: HomepageDiscoveryPillIconStyle;
  onPillPress?: (pillId: HomepageDiscoveryPillId, position: number) => void;
}
