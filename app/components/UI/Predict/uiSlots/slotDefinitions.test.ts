import { PREDICT_UI_SLOT_DEFINITIONS } from './slotDefinitions';

describe('PREDICT_UI_SLOT_DEFINITIONS', () => {
  it('registers the closed Wallet homepage Predict empty-state capability', () => {
    const definition =
      PREDICT_UI_SLOT_DEFINITIONS['wallet-home.predict-empty-state'];

    expect(definition).toEqual({
      widgetTypes: ['predict-discovery-list'],
      dataReferenceTypes: ['predict-homepage-market-slots'],
      requiredDataReferenceTypes: ['predict-homepage-market-slots'],
    });
  });
});
