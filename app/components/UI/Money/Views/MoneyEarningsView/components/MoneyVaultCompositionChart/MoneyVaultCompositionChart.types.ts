import type { VaultCompositionResponse } from '../../../../types/moneyVaultComposition';

export type VaultComponent = VaultCompositionResponse['components'][number];
export type ComponentKey = VaultComponent['component_key'];

export interface MoneyVaultCompositionChartProps {
  components: VaultCompositionResponse['components'];
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

export type VaultCompositionChartInvalidReason =
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
