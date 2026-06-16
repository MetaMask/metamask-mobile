/* eslint-disable import-x/no-extraneous-dependencies */
import {
  createServer,
  KnowledgeStore,
  setKnowledgeStore,
} from '@metamask/client-mcp-core';

jest.mock('@metamask/client-mcp-core', () => ({
  createServer: jest.fn(),
  KnowledgeStore: jest.fn().mockImplementation(() => ({
    read: jest.fn(),
    write: jest.fn(),
  })),
  setKnowledgeStore: jest.fn(),
}));
jest.mock('../metamask-provider', () => ({
  MetaMaskMobileSessionManager: jest.fn().mockImplementation(() => ({
    getPlatformDriver: jest.fn(),
  })),
}));
jest.mock('../capabilities', () => ({
  createMetaMaskMobileE2EContext: jest.fn((options: unknown) => ({
    config: { environment: 'e2e' },
    options,
  })),
}));
jest.mock('../resolve-repo-root', () => ({
  resolveRepoRoot: jest.fn(() => '/repo/root'),
}));
jest.mock('../utils', () => ({
  checkPortAvailable: jest.fn().mockResolvedValue(undefined),
}));

const mockCreateServer = createServer as jest.MockedFunction<
  typeof createServer
>;
const mockKnowledgeStore = KnowledgeStore as jest.MockedClass<
  typeof KnowledgeStore
>;
const mockSetKnowledgeStore = setKnowledgeStore as jest.MockedFunction<
  typeof setKnowledgeStore
>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ServerConfig = {
  sessionManager: unknown;
  knowledgeStore: unknown;
  idleShutdownMs: number;
  logFilePath: string;
  contextFactory: () => Promise<{
    config: { environment: string };
    allocatedPorts: { anvil: number; fixture: number; mock: number };
  }>;
};

const importDaemon = (): ServerConfig => {
  mockCreateServer.mockReturnValue({
    start: jest.fn().mockReturnValue(new Promise(() => undefined)),
  } as never);

  jest.isolateModules(() => {
    jest.requireActual('../daemon');
  });

  return mockCreateServer.mock.calls[0][0] as unknown as ServerConfig;
};

describe('daemon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates a KnowledgeStore and registers it as the global', () => {
    importDaemon();

    expect(mockKnowledgeStore).toHaveBeenCalledTimes(1);
    expect(mockSetKnowledgeStore).toHaveBeenCalledWith(expect.any(Object));
  });

  it('calls createServer with a sessionManager, knowledgeStore, idleShutdownMs, logFilePath, and contextFactory', () => {
    const config = importDaemon();

    expect(config.sessionManager).toBeDefined();
    expect(config.knowledgeStore).toBeDefined();
    expect(config.idleShutdownMs).toBeDefined();
    expect(config.logFilePath).toBeDefined();
    expect(config.contextFactory).toEqual(expect.any(Function));
  });

  it('idleShutdownMs is set to 30 minutes', () => {
    const config = importDaemon();

    expect(config.idleShutdownMs).toBe(1_800_000);
  });

  it('logFilePath ends with .mm-daemon.log', () => {
    const config = importDaemon();

    expect(config.logFilePath.endsWith('.mm-daemon.log')).toBe(true);
  });

  it('contextFactory uses hardcoded default ports', async () => {
    const config = importDaemon();

    const context = await config.contextFactory();

    expect(context.allocatedPorts).toEqual({
      anvil: 8545,
      fixture: 12345,
      mock: 8000,
    });
  });

  it('contextFactory returns a WorkflowContext with config.environment === e2e', async () => {
    const config = importDaemon();

    const context = await config.contextFactory();

    expect(context.config.environment).toBe('e2e');
  });

  it('exits with an error when a default port is already in use', async () => {
    const { checkPortAvailable } = jest.requireMock('../utils') as {
      checkPortAvailable: jest.Mock;
    };
    checkPortAvailable.mockRejectedValueOnce(
      new Error(
        'Port 8545 (anvil) is already in use. ' +
          'Another worktree daemon or external service may be occupying it. ' +
          'Stop the conflicting process before starting the daemon.',
      ),
    );

    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    const mockStderr = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    importDaemon();

    // Let the async assertPortsAvailable → catch chain settle.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockStderr).toHaveBeenCalledWith(
      expect.stringContaining('Port 8545 (anvil) is already in use'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockStderr.mockRestore();
  });
});
