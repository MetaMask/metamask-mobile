import type { UiSlotDefinitions } from '../../../../core/Engine/controllers/ui-slots-controller/slotDefinitions';

export const PREDICT_UI_SLOT_DEFINITIONS: UiSlotDefinitions = {
  'wallet-home.predict-empty-state': {
    widgetTypes: ['predict-discovery-list'],
    dataReferenceTypes: ['predict-homepage-market-slots'],
    requiredDataReferenceTypes: ['predict-homepage-market-slots'],
  },
};
