/**
 * Integration test — sits between component-view (mocks state) and e2e
 * (mocks nothing). Wires up the REAL WidgetController, mocks ONLY the
 * I/O boundary (the WidgetService). The controller's logic actually runs,
 * so an integration bug in the controller — exactly the kind your perps
 * e2e caught in extension — fails this test in jest, in milliseconds,
 * with no device/simulator/network.
 */
import { Messenger } from '@metamask/messenger';
import {
  WidgetController,
  WidgetService,
  WidgetControllerEvents,
} from '../src/WidgetController';
import {
  selectWidgetTotalCents,
  selectWidgetCount,
} from '../src/widgetSelectors';

function buildIntegration(service: WidgetService) {
  const messenger = new Messenger<
    'WidgetController',
    never,
    WidgetControllerEvents,
    never
  >({ namespace: 'WidgetController' });
  return new WidgetController({ messenger, service });
}

describe('WidgetSummary integration (real controller, mocked I/O)', () => {
  it('updates the total when a widget is added through the real controller', async () => {
    const controller = buildIntegration({
      fetchWidget: async (id) => ({ id, label: 'Real', price: 7.25 }),
    });

    expect(selectWidgetCount(controller.state)).toBe(0);

    await controller.addWidget('w-1');

    expect(selectWidgetCount(controller.state)).toBe(1);
    expect(selectWidgetTotalCents(controller.state)).toBe(725);
  });

  it('keeps the loading flag accurate when the service rejects', async () => {
    const controller = buildIntegration({
      fetchWidget: async () => { throw new Error('network down'); },
    });

    await expect(controller.addWidget('w-bad')).rejects.toThrow('network down');
    expect(controller.state.loading).toBe(false);
    expect(selectWidgetCount(controller.state)).toBe(0);
  });
});
