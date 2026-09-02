import { PREDICT_UI_SLOTS_V1_CONTRACTS } from '../Predict/uiSlots/contracts/v1';
import { composeUiSlotsContractRegistry } from '../../../core/Engine/controllers/ui-slots-controller/contracts/registry';

export const MOBILE_UI_SLOTS_CONTRACT_REGISTRY = composeUiSlotsContractRegistry(
  PREDICT_UI_SLOTS_V1_CONTRACTS,
);
