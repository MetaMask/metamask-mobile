import axios, { type AxiosResponse } from 'axios';
import DevLogger from '../../core/SDKConnect/utils/DevLogger';
import {
  handleExportAppStateCommand,
  handleExportStateCommand,
} from './e2eStateExport';

let mockHasTestOverrides = false;
jest.mock('./utils', () => ({
  get hasTestOverrides() {
    return mockHasTestOverrides;
  },
  getCommandQueueServerPortInApp: () => 2446,
}));

jest.mock('axios');
jest.mock('../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));
jest.mock('./e2eStateExport', () => ({
  handleExportStateCommand: jest.fn().mockResolvedValue(undefined),
  handleExportAppStateCommand: jest.fn().mockResolvedValue(undefined),
}));

const mockDispatchPerpsCommand = jest.fn();
jest.mock('./e2ePerpsCommandHandler', () => ({
  dispatchPerpsCommand: (...args: unknown[]) =>
    mockDispatchPerpsCommand(...args),
}));

const mockDispatchQrSyncCommand = jest.fn();
jest.mock('./e2eQrSyncCommandHandler', () => ({
  dispatchQrSyncCommand: (...args: unknown[]) =>
    mockDispatchQrSyncCommand(...args),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Successful probe response for the initial server check
const probeResponse = {
  status: 200,
  data: { queue: [] },
} as AxiosResponse;

const SECRET_JWT =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJlMmUtZml4dHVyZSJ9.e2e-signature';
const SECRET_MNEMONIC =
  'e2e abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

function renderLogValue(value: unknown, seen = new WeakSet<object>()): string {
  if (typeof value === 'string') {
    return value;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value == null
  ) {
    return String(value);
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  if (seen.has(value)) {
    return '';
  }
  seen.add(value);
  if (value instanceof Error) {
    const extras = Object.fromEntries(Object.entries(value));
    return `${value.name} ${value.message} ${renderLogValue(extras, seen)}`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => renderLogValue(item, seen)).join(' ');
  }
  return Object.entries(value)
    .map(([key, entry]) => `${key} ${renderLogValue(entry, seen)}`)
    .join(' ');
}

function renderedPollingLogs(): string {
  return (DevLogger.log as jest.Mock).mock.calls
    .map((call: unknown[]) => call.map((arg) => renderLogValue(arg)).join(' '))
    .join('\n');
}

// Helper to flush async microtasks so pollOnce promise chains resolve
async function flushMicrotasks(count = 10) {
  for (let i = 0; i < count; i++) {
    await Promise.resolve();
  }
}

// We need to re-import the module fresh for each test since it has module-level state
// (hasStartedPolling, etc.). We use jest.isolateModules for this.
function loadModule() {
  let mod: { startE2ECommandPolling: () => Promise<void> } | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('./e2eCommandPolling');
  });
  if (!mod) {
    throw new Error('Failed to load e2eCommandPolling module');
  }
  return mod;
}

describe('e2eCommandPolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockHasTestOverrides = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not start polling when hasTestOverrides is false', async () => {
    mockHasTestOverrides = false;
    const { startE2ECommandPolling } = loadModule();

    await startE2ECommandPolling();

    expect(jest.getTimerCount()).toBe(0);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('does not start polling when server probe fails', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await startE2ECommandPolling();

    // Probe failed, so no timer should be scheduled
    expect(jest.getTimerCount()).toBe(0);
  });

  it('starts polling when hasTestOverrides is true and server is reachable', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    // Probe succeeds
    mockedAxios.get.mockResolvedValueOnce(probeResponse);

    await startE2ECommandPolling();

    // A timer should be scheduled for the first poll
    expect(jest.getTimerCount()).toBe(1);
  });

  it('does not start polling twice', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    mockedAxios.get.mockResolvedValueOnce(probeResponse);

    await startE2ECommandPolling();
    await startE2ECommandPolling();

    // Still only one timer (second call is a no-op)
    expect(jest.getTimerCount()).toBe(1);
  });

  it('dispatches export-state command to handleExportStateCommand', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    // First call: probe succeeds
    // Second call: poll returns export-state command
    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: {
        queue: [{ type: 'export-state', args: {} }],
      },
    } as AxiosResponse);

    await startE2ECommandPolling();

    // Run the first scheduled timer (the immediate poll)
    jest.advanceTimersByTime(0);

    // Let the async poll resolve
    await flushMicrotasks();

    expect(handleExportStateCommand).toHaveBeenCalled();
  });

  it('dispatches export-app-state command to handleExportAppStateCommand', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();
    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: {
        queue: [{ type: 'export-app-state', args: {} }],
      },
    } as AxiosResponse);

    await startE2ECommandPolling();
    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    expect(handleExportAppStateCommand).toHaveBeenCalled();
  });

  it('leaves export-app-state errors out of polling logs', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();
    const exportError = Object.assign(new Error('export failed'), {
      config: {
        data: JSON.stringify({
          engine: { AuthenticationController: { jwt: SECRET_JWT } },
        }),
      },
    });
    (handleExportAppStateCommand as jest.Mock).mockRejectedValueOnce(
      exportError,
    );
    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: {
        queue: [{ type: 'export-app-state', args: {} }],
      },
    } as AxiosResponse);

    await startE2ECommandPolling();
    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    expect(renderedPollingLogs()).not.toContain(SECRET_JWT);
    expect(handleExportAppStateCommand).toHaveBeenCalled();
  });

  it('reschedules after receiving an empty queue', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: { queue: [] },
    } as AxiosResponse);

    await startE2ECommandPolling();

    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    // Should have rescheduled after empty queue
    expect(jest.getTimerCount()).toBe(1);
  });

  it('reschedules after receiving null queue data', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: { queue: null },
    } as AxiosResponse);

    await startE2ECommandPolling();

    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    expect(jest.getTimerCount()).toBe(1);
  });

  it('dispatches push-price command to perps handler', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    const command = {
      type: 'push-price',
      args: { symbol: 'ETH', price: '3000' },
    };
    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: { queue: [command] },
    } as AxiosResponse);

    await startE2ECommandPolling();

    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    expect(mockDispatchPerpsCommand).toHaveBeenCalledWith(command);
  });

  it('dispatches apply-qr-sync-sync-ready command to QR sync handler', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    const command = {
      type: 'apply-qr-sync-sync-ready',
      args: {
        mnemonic: 'test mnemonic',
        isPrimary: true,
      },
    };
    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: { queue: [command] },
    } as AxiosResponse);

    await startE2ECommandPolling();

    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    expect(mockDispatchQrSyncCommand).toHaveBeenCalledWith(command);
  });

  it('dispatches force-liquidation command to perps handler', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    const command = { type: 'force-liquidation', args: { symbol: 'BTC' } };
    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: { queue: [command] },
    } as AxiosResponse);

    await startE2ECommandPolling();

    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    expect(mockDispatchPerpsCommand).toHaveBeenCalledWith(command);
  });

  it('dispatches mock-deposit command to perps handler', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    const command = { type: 'mock-deposit', args: { amount: '5000' } };
    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: { queue: [command] },
    } as AxiosResponse);

    await startE2ECommandPolling();

    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    expect(mockDispatchPerpsCommand).toHaveBeenCalledWith(command);
  });

  it('skips null or non-object items in the queue', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: {
        queue: [null, 'invalid', { type: 'export-state', args: {} }],
      },
    } as AxiosResponse);

    await startE2ECommandPolling();

    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    // Should still process the valid export-state command
    expect(handleExportStateCommand).toHaveBeenCalledTimes(1);
  });

  it('disables polling after consecutive non-200 responses', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    const non200Response = { status: 500, data: {} } as AxiosResponse;

    // Probe succeeds, then two consecutive non-200 polls
    mockedAxios.get
      .mockResolvedValueOnce(probeResponse)
      .mockResolvedValueOnce(non200Response)
      .mockResolvedValueOnce(non200Response);

    await startE2ECommandPolling();

    // First poll: non-200
    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    // Second poll: non-200 → disables polling
    jest.advanceTimersByTime(2000);
    await flushMicrotasks();

    // No more timers should be scheduled (polling disabled)
    expect(jest.getTimerCount()).toBe(0);
  });

  it('disables polling after consecutive network errors', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    // Probe succeeds, then two consecutive errors
    mockedAxios.get
      .mockResolvedValueOnce(probeResponse)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    await startE2ECommandPolling();

    // First poll: error
    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    // Second poll: error → disables polling
    jest.advanceTimersByTime(2000);
    await flushMicrotasks();

    // No more timers (polling disabled)
    expect(jest.getTimerCount()).toBe(0);
  });

  it('resets consecutive failures after a successful poll', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    const non200Response = { status: 500, data: {} } as AxiosResponse;
    const emptyQueueResponse = {
      status: 200,
      data: { queue: [] },
    } as AxiosResponse;

    // Probe, then: non-200, success, non-200 — should NOT disable
    mockedAxios.get
      .mockResolvedValueOnce(probeResponse)
      .mockResolvedValueOnce(non200Response)
      .mockResolvedValueOnce(emptyQueueResponse)
      .mockResolvedValueOnce(non200Response);

    await startE2ECommandPolling();

    // First poll: non-200 (failures = 1)
    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    // Second poll: success (failures reset to 0)
    jest.advanceTimersByTime(2000);
    await flushMicrotasks();

    // Third poll: non-200 (failures = 1, not ≥ 2)
    jest.advanceTimersByTime(2000);
    await flushMicrotasks();

    // Polling should still be scheduled (not disabled)
    expect(jest.getTimerCount()).toBe(1);
  });

  it('logs error and continues when export-state handler throws', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    (handleExportStateCommand as jest.Mock).mockRejectedValueOnce(
      new Error('handler error'),
    );

    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: {
        queue: [{ type: 'export-state', args: {} }],
      },
    } as AxiosResponse);

    await startE2ECommandPolling();

    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    expect(handleExportStateCommand).toHaveBeenCalled();
    // Polling should still be rescheduled despite the error
    expect(jest.getTimerCount()).toBe(1);
  });

  it('leaves command secrets out of polling logs', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();
    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: {
        queue: [
          {
            type: 'apply-qr-sync-sync-ready',
            args: { mnemonic: SECRET_MNEMONIC, idToken: SECRET_JWT },
          },
        ],
      },
    } as AxiosResponse);

    await startE2ECommandPolling();
    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    const logs = renderedPollingLogs();
    expect(logs).not.toContain(SECRET_MNEMONIC);
    expect(logs).not.toContain(SECRET_JWT);
    expect(mockDispatchQrSyncCommand).toHaveBeenCalled();
  });

  it('leaves export request bodies out of polling error logs', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();
    const exportError = Object.assign(new Error('export failed'), {
      config: {
        data: JSON.stringify({
          engine: { AuthenticationController: { jwt: SECRET_JWT } },
          redux: { settings: { mnemonic: SECRET_MNEMONIC } },
        }),
      },
    });
    (handleExportStateCommand as jest.Mock).mockRejectedValueOnce(exportError);
    mockedAxios.get.mockResolvedValueOnce(probeResponse).mockResolvedValueOnce({
      status: 200,
      data: {
        queue: [{ type: 'export-state', args: {} }],
      },
    } as AxiosResponse);

    await startE2ECommandPolling();
    jest.advanceTimersByTime(0);
    await flushMicrotasks();

    const logs = renderedPollingLogs();
    expect(logs).not.toContain(SECRET_JWT);
    expect(logs).not.toContain(SECRET_MNEMONIC);
    expect(handleExportStateCommand).toHaveBeenCalled();
  });

  it('uses debug.json endpoint for server probe', async () => {
    mockHasTestOverrides = true;
    const { startE2ECommandPolling } = loadModule();

    mockedAxios.get.mockResolvedValueOnce(probeResponse);

    await startE2ECommandPolling();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:2446/debug.json',
      { timeout: 3000 },
    );
  });
});
