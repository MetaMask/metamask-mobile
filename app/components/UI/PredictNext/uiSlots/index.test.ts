/* eslint-disable @typescript-eslint/no-require-imports, import-x/no-commonjs */
describe('PredictNext UI Slots widget', () => {
  // The Homepage section reaches the UI Slots registry, which reads the
  // widget from the entry point while the entry point is still loading.
  // Loading the entry point first proves the widget is ready by then.
  it('reaches the UI Slots registry when the entry point loads first', () => {
    jest.isolateModules(() => {
      const entryPoint = require('..');
      const { MOBILE_UI_SLOT_WIDGETS } = require('../../UiSlots/registry');

      expect(entryPoint.PredictDiscoveryListWidget).toEqual(
        expect.any(Function),
      );
      expect(MOBILE_UI_SLOT_WIDGETS['predict-discovery-list']).toBe(
        entryPoint.PredictDiscoveryListWidget,
      );
    });
  });
});
