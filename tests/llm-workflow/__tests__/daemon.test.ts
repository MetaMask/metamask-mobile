/* eslint-disable import-x/no-extraneous-dependencies */
import {
  createServer,
  KnowledgeStore,
  setKnowledgeStore,
} from '@metamask/client-mcp-core';
import { createMetaMaskMobileContext } from '../capabilities';

jest.mock('@metamask/client-mcp-core', () => ({
  createServer: jest.fn(),
  KnowledgeStore: jest.fn().mockImplementation(() => ({})),
  setKnowledgeStore: jest.fn(),
}));
jest.mock('../metamask-provider', () => ({
  MetaMaskMobileSessionManager: jest.fn().mockImplementation(() => ({
    getPlatformDriver: jest.fn(),
  })),
}));
jest.mock('../capabilities', () => ({
  createMetaMaskMobileContext: jest.fn(() => ({
    config: { environment: 'prod' },
    stateSnapshot: {},
  })),
}));
jest.mock('../resolve-repo-root', () => ({
  resolveRepoRoot: jest.fn(() => '/repo/root'),
}));

const mockCreateServer = jest.mocked(createServer);
const mockKnowledgeStore = jest.mocked(KnowledgeStore);
const mockSetKnowledgeStore = jest.mocked(setKnowledgeStore);
const mockCreateMetaMaskMobileContext = jest.mocked(
  createMetaMaskMobileContext,
);

interface ServerConfig {
  sessionManager: { getPlatformDriver: () => unknown };
  knowledgeStore: unknown;
  idleShutdownMs: number;
  logFilePath: string;
  contextFactory: () => Promise<Record<string, unknown>>;
}

function importDaemon(): ServerConfig {
  mockCreateServer.mockReturnValue({
    start: jest.fn().mockReturnValue(new Promise(() => undefined)),
  } as never);

  jest.isolateModules(() => {
    jest.requireActual('../daemon');
  });

  return mockCreateServer.mock.calls[0][0] as unknown as ServerConfig;
}

describe('daemon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers one knowledge store and configures the server', () => {
    const config = importDaemon();

    expect(mockKnowledgeStore).toHaveBeenCalledTimes(1);
    expect(mockSetKnowledgeStore).toHaveBeenCalledWith(config.knowledgeStore);
    expect(config.idleShutdownMs).toBe(30 * 60 * 1000);
    expect(config.logFilePath).toBe('/repo/root/.mm-daemon.log');
  });

  it('constructs only the prod workflow context without allocated E2E ports', async () => {
    const config = importDaemon();

    const context = await config.contextFactory();

    expect(mockCreateMetaMaskMobileContext).toHaveBeenCalledWith({
      getPlatformDriver: expect.any(Function),
    });
    expect(context).toEqual({
      config: { environment: 'prod' },
      stateSnapshot: {},
    });
    expect(context).not.toHaveProperty('allocatedPorts');
  });
});
