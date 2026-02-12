import axios, { type AxiosResponse } from 'axios';
import { handleExportStateCommand } from './e2eStateExport';

let mockIsE2E = false;
jest.mock('./utils', () => ({
  get isE2E() {
    return mockIsE2E;
  },
  getCommandQueueServerPortInApp: () => 2446,
}));

jest.mock('axios');
jest.mock('../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));
jest.mock('./e2eStateExport', () => ({
  handleExportStateCommand: jest.fn().mockResolvedValue(undefined),
}));

const mockDispatchPerpsCommand = jest.fn();
jest.mock('./e2ePerpsCommandHandler', () => ({
  dispatchPerpsCommand: (...args: unknown[]) =>
    mockDispatchPerpsCommand(...args),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Successful probe response for the initial server check
const probeResponse = {
  status: 200,
  data: { queue: [] },
} as AxiosResponse;

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
    mockIsE2E = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not start polling when isE2E is false', async () => {
    mockIsE2E = false;
    const { startE2ECommandPolling } = loadModule();

    await startE2ECommandPolling();

    expect(jest.getTimerCount()).toBe(0);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('does not start polling when server probe fails', async () => {
    mockIsE2E = true;
    const { startE2ECommandPolling } = loadModule();

    mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await startE2ECommandPolling();

    // Probe failed, so no timer should be scheduled
    expect(jest.getTimerCount()).toBe(0);
  });

  it('starts polling when isE2E is true and server is reachable', async () => {
    mockIsE2E = true;
    const { startE2ECommandPolling } = loadModule();

    // Probe succeeds
    mockedAxios.get.mockResolvedValueOnce(probeResponse);

    await startE2ECommandPolling();

    // A timer should be scheduled for the first poll
    expect(jest.getTimerCount()).toBe(1);
  });

  it('does not start polling twice', async () => {
    mockIsE2E = true;
    const { startE2ECommandPolling } = loadModule();

    mockedAxios.get.mockResolvedValueOnce(probeResponse);

    await startE2ECommandPolling();
    await startE2ECommandPolling();

    // Still only one timer (second call is a no-op)
    expect(jest.getTimerCount()).toBe(1);
  });

  it('dispatches export-state command to handleExportStateCommand', async () => {
    mockIsE2E = true;
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

  it('reschedules after receiving an empty queue', async () => {
    mockIsE2E = true;
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
    mockIsE2E = true;
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
    mockIsE2E = true;
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

  it('dispatches force-liquidation command to perps handler', async () => {
    mockIsE2E = true;
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
    mockIsE2E = true;
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
    mockIsE2E = true;
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
    mockIsE2E = true;
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
    mockIsE2E = true;
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
    mockIsE2E = true;
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
    mockIsE2E = true;
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

  it('uses debug.json endpoint for server probe', async () => {
    mockIsE2E = true;
    const { startE2ECommandPolling } = loadModule();

    mockedAxios.get.mockResolvedValueOnce(probeResponse);

    await startE2ECommandPolling();

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://localhost:2446/debug.json',
      { timeout: 3000 },
    );
  });
});
