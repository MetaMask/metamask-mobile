import type {
  StateMetadataConstraint,
  StatePropertyMetadataConstraint,
} from '@metamask/base-controller';
import type {
  PreferencesController,
  PreferencesState,
} from '@metamask/preferences-controller';
import type { Hex } from '@metamask/utils';

export type AdvancedGasFeePreferences = Record<string, string> & {
  userFeeLevel: string;
};

export type AdvancedGasFeePreferencesByChain = Record<
  string,
  Record<string, AdvancedGasFeePreferences>
>;

export type PreferencesStateWithSavedGasFees = PreferencesState & {
  advancedGasFee: AdvancedGasFeePreferencesByChain;
};

export interface SetAdvancedGasFeeParams {
  account: Hex;
  chainId: Hex;
  gasFeePreferences?: AdvancedGasFeePreferences;
}

export type PreferencesControllerWithSavedGasFees = PreferencesController & {
  metadata: StateMetadataConstraint;
  state: PreferencesStateWithSavedGasFees;
  setAdvancedGasFee(params: SetAdvancedGasFeeParams): void;
};

export type PreferencesControllerStateUpdater = (
  callback: (
    state: PreferencesStateWithSavedGasFees,
  ) => void | PreferencesStateWithSavedGasFees,
) => void;

export type MutablePreferencesControllerWithSavedGasFees =
  PreferencesControllerWithSavedGasFees & {
    update: PreferencesControllerStateUpdater;
  };

export const ADVANCED_GAS_FEE_METADATA: StatePropertyMetadataConstraint = {
  includeInDebugSnapshot: true,
  includeInStateLogs: true,
  persist: true,
  usedInUi: true,
};
