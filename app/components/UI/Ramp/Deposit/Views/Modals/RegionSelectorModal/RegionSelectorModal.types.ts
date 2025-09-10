import { DepositRegion } from '../../../constants';

export interface RegionSelectorModalParams {
  selectedRegionCode?: string;
  handleSelectRegion?: (region: DepositRegion) => void;
}
