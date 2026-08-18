import type { UiSlotDefinitions } from '../../../../core/Engine/controllers/ui-slots-controller/slotDefinitions';

export const PREDICT_UI_SLOT_DEFINITIONS: UiSlotDefinitions = {
  'predict-home.before-portfolio': {
    widgetTypes: ['alert-banner'],
    actionIds: ['dismiss'],
    dataReferenceTypes: [],
  },
  'predict-home.after-portfolio': {
    widgetTypes: ['alert-banner'],
    actionIds: ['dismiss'],
    dataReferenceTypes: [],
  },
  'predict-home.after-live-now': {
    widgetTypes: ['alert-banner'],
    actionIds: ['dismiss'],
    dataReferenceTypes: [],
  },
  'predict-home.after-categories': {
    widgetTypes: ['alert-banner'],
    actionIds: ['dismiss'],
    dataReferenceTypes: [],
  },
  'predict-home.after-popular-today': {
    widgetTypes: ['alert-banner'],
    actionIds: ['dismiss'],
    dataReferenceTypes: [],
  },
  'predict-home.after-trending': {
    widgetTypes: ['alert-banner'],
    actionIds: ['dismiss'],
    dataReferenceTypes: [],
  },
  'predict-home.live-now': {
    widgetTypes: ['market-carousel'],
    actionIds: ['navigate-deeplink'],
    dataReferenceTypes: ['predict-feed'],
    requiredDataReferenceTypes: ['predict-feed'],
  },
};
