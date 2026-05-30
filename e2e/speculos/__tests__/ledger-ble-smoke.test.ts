import { SpeculosTestHelper } from '../speculos-ble-test-helper/src';

const SPECULOS_HOST = process.env.SPECULOS_HOST ?? '127.0.0.1';
const CONTROL_API_PORT = parseInt(process.env.CONTROL_API_PORT ?? '5002', 10);
const SPECULOS_API_PORT = parseInt(process.env.SPECULOS_API_PORT ?? '5100', 10);

const describeIf =
  process.env.RUN_SPECULOS_E2E === '1' ? describe : describe.skip;

describeIf('Ledger BLE E2E Smoke Test', () => {
  let helper: SpeculosTestHelper;

  beforeAll(async () => {
    helper = new SpeculosTestHelper({
      speculosHost: SPECULOS_HOST,
      controlApiPort: CONTROL_API_PORT,
      speculosApiPort: SPECULOS_API_PORT,
    });
    await helper.start();
  });

  afterAll(async () => {
    await helper.disconnectBle();
  });

  it('control API health check succeeds', async () => {
    const health = await helper.controlApi.health();
    expect(health.status).toBe('ready');
  });

  it('can press buttons on the emulated device', async () => {
    await helper.pressButton('right', 2);
    await helper.pressButton('left', 1);
  });

  it('can take a screenshot', async () => {
    const screenshot = await helper.takeScreenshot();
    expect(screenshot.length).toBeGreaterThan(0);
    expect(screenshot[0]).toBe(0x89);
    expect(screenshot[1]).toBe(0x50);
  });

  it('reports BLE connection state', async () => {
    const state = await helper.controlApi.getConnectionState();
    expect(state).toHaveProperty('state');
    expect(state).toHaveProperty('has_connection');
  });

  it('can inject error response', async () => {
    await helper.controlApi.injectError('6985');
  });

  it('APDU log is accessible', async () => {
    const log = await helper.controlApi.getApduLog();
    expect(Array.isArray(log)).toBe(true);
  });
});
