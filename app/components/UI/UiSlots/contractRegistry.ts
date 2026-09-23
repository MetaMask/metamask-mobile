import type { UiSlotsContractRegistry } from '../../../core/Engine/controllers/ui-slots-controller/contracts/registry';
import { PREDICT_UI_SLOTS_V1_CONTRACTS } from '../Predict/uiSlots/contracts/v1';

/** Mobile-owned UI Slots contracts assembled from feature registrations. */
export const MOBILE_UI_SLOTS_CONTRACTS: UiSlotsContractRegistry = {
  slots: {
    ...PREDICT_UI_SLOTS_V1_CONTRACTS.slots,
  },
  widgets: {
    ...PREDICT_UI_SLOTS_V1_CONTRACTS.widgets,
  },
  dataReferences: {
    ...PREDICT_UI_SLOTS_V1_CONTRACTS.dataReferences,
  },
};
