import * as fs from 'fs';
import * as path from 'path';
import { Messenger } from '@metamask/messenger';
import {
  WidgetController,
  WidgetService,
  WidgetControllerEvents,
} from '../src/WidgetController';

const FIXTURE_DIR = path.join(__dirname, '__fixtures__');

function buildController(overrides: { service?: Partial<WidgetService> } = {}) {
  const messenger = new Messenger<
    'WidgetController',
    never,
    WidgetControllerEvents,
    never
  >({ namespace: 'WidgetController' });

  const service: WidgetService = {
    fetchWidget: jest.fn(async (id: string) => ({
      id,
      label: `Widget ${id}`,
      price: 12.34,
    })),
    ...overrides.service,
  };

  const controller = new WidgetController({
    messenger,
    service,
    now: () => 1_700_000_000_000,
  });

  return { controller, service };
}

describe('WidgetController — behaviour', () => {
  it('adds a widget and derives priceCents from price', async () => {
    const { controller } = buildController();

    await controller.addWidget('w-1');

    expect(controller.state.widgets['w-1']).toEqual({
      id: 'w-1',
      label: 'Widget w-1',
      price: 12.34,
      priceCents: 1234,
    });
    expect(controller.state.loading).toBe(false);
    expect(controller.state.lastSyncedAt).toBe(1_700_000_000_000);
  });

  it('clears loading even if the service throws', async () => {
    const { controller } = buildController({
      service: { fetchWidget: jest.fn(async () => { throw new Error('boom'); }) },
    });

    await expect(controller.addWidget('w-bad')).rejects.toThrow('boom');
    expect(controller.state.loading).toBe(false);
  });
});

/**
 * Fixture-verification suite. Fixtures are committed JSON files under
 * test/__fixtures__/. This suite re-runs the same scenario the fixture
 * was captured from, and asserts the controller still produces the same
 * shape. If the controller's emitted state changes intentionally, run
 * with UPDATE_FIXTURES=1 to regenerate (similar to `jest -u` for snapshots).
 *
 * This is the source-of-truth that component tests downstream consume.
 */
describe('WidgetController — fixtures (single source of truth for component tests)', () => {
  beforeAll(() => fs.mkdirSync(FIXTURE_DIR, { recursive: true }));

  it('emits the documented state for "two widgets added"', async () => {
    const { controller } = buildController({
      service: {
        fetchWidget: jest.fn(async (id: string) => ({
          id,
          label: id === 'w-1' ? 'Bolt' : 'Nut',
          price: id === 'w-1' ? 9.99 : 0.5,
        })),
      },
    });

    await controller.addWidget('w-1');
    await controller.addWidget('w-2');

    const fixturePath = path.join(FIXTURE_DIR, 'twoWidgetsAdded.json');
    const actual = JSON.parse(JSON.stringify(controller.state));

    if (process.env.UPDATE_FIXTURES === '1' || !fs.existsSync(fixturePath)) {
      fs.writeFileSync(fixturePath, JSON.stringify(actual, null, 2) + '\n');
    }

    const committed = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    expect(actual).toEqual(committed);
  });
});
