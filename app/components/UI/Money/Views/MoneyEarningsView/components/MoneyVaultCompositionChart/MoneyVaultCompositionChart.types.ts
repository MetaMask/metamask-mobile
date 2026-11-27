import type { VaultCompositionResponse } from '../../../../types/moneyVaultComposition';

type VaultComponent = VaultCompositionResponse['components'][number];
export type ComponentKey = VaultComponent['component_key'];

export interface MoneyVaultCompositionChartProps {
  components: VaultCompositionResponse['components'];
  isLoading?: boolean;
  setScrollEnabled?: (enabled: boolean) => void;
}

export interface VaultCompositionWedge {
  component: VaultComponent;
  componentKey: ComponentKey;
  allocationFraction: string;
  segmentStartAngle: number;
  segmentEndAngle: number;
  paintedStartAngle: number;
  paintedEndAngle: number;
  paintedAngleDegrees: number;
  path: string;
  pressedPath: string;
}

type VaultCompositionChartInvalidReason =
  | 'duplicate_component_key'
  | 'invalid_allocation_fraction'
  | 'infeasible_geometry';

export type VaultCompositionChartModel =
  | {
      status: 'ready';
      wedges: VaultCompositionWedge[];
      defaultActiveKey: ComponentKey;
    }
  | { status: 'empty' }
  | { status: 'invalid'; reason: VaultCompositionChartInvalidReason };
