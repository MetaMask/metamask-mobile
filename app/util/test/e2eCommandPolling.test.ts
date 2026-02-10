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

// We need to re-import the module fresh for each test since it has module-level state
// (hasStartedPolling, etc.). We use jest.isolateModules for this.
function loadModule() {
  let mod: { startE2EGenericCommandPolling: () => void } | undefined;
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

  it('does not start polling when isE2E is false', () => {
    mockIsE2E = false;
    const { startE2EGenericCommandPolling } = loadModule();

    startE2EGenericCommandPolling();

    // No timers should be scheduled
    expect(jest.getTimerCount()).toBe(0);
  });

  it('starts polling when isE2E is true', () => {
    mockIsE2E = true;
    const { startE2EGenericCommandPolling } = loadModule();

    startE2EGenericCommandPolling();

    // A timer should be scheduled for the first poll
    expect(jest.getTimerCount()).toBe(1);
  });

  it('does not start polling twice', () => {
    mockIsE2E = true;
    const { startE2EGenericCommandPolling } = loadModule();

    startE2EGenericCommandPolling();
    startE2EGenericCommandPolling();

    // Still only one timer
    expect(jest.getTimerCount()).toBe(1);
  });

  it('dispatches export-state command to handleExportStateCommand', async () => {
    mockIsE2E = true;
    const { startE2EGenericCommandPolling } = loadModule();

    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: {
        queue: [{ type: 'export-state', args: {} }],
      },
    } as AxiosResponse);

    startE2EGenericCommandPolling();

    // Run the first scheduled timer (the immediate poll)
    jest.advanceTimersByTime(0);

    // Let the async poll resolve
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(handleExportStateCommand).toHaveBeenCalled();
  });

  it('does not make any network requests when isE2E is false', async () => {
    mockIsE2E = false;
    const { startE2EGenericCommandPolling } = loadModule();

    startE2EGenericCommandPolling();

    jest.advanceTimersByTime(10000);
    await Promise.resolve();

    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
