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

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Successful probe response for the initial server check
const probeResponse = {
  status: 200,
  data: { queue: [] },
} as AxiosResponse;

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
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(handleExportStateCommand).toHaveBeenCalled();
  });
});
