const mockCloseAllConnections = jest.fn();
const mockClose = jest.fn((callback: (error?: Error) => void) => callback());
const mockListen = jest.fn((_port: number, callback: () => void) => callback());
const mockServer = {
  close: mockClose,
  closeAllConnections: mockCloseAllConnections,
  listen: mockListen,
  listening: true,
  once: jest.fn(),
};

jest.mock('http', () => ({
  __esModule: true,
  default: {
    createServer: jest.fn(() => mockServer),
  },
}));

jest.mock('serve-handler', () => jest.fn());

jest.mock('./index.ts', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
  }),
  ServerStatus: {
    STARTED: 'STARTED',
    STOPPED: 'STOPPED',
  },
}));

const mockReleaseMultiInstancePort = jest.fn();
jest.mock('./PortManager.ts', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      releaseMultiInstancePort: mockReleaseMultiInstancePort,
    }),
  },
  ResourceType: {
    DAPP_SERVER: 'DAPP_SERVER',
  },
}));

import { DappVariants } from './Constants.ts';
import DappServer from './DappServer.ts';

describe('DappServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServer.listening = true;
  });

  it('closes retained WebView connections during teardown', async () => {
    const server = new DappServer({
      dappCounter: 0,
      rootDirectory: '/tmp/test-dapp',
      dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
    });
    server.setServerPort(8093);
    await server.start();

    await server.stop();

    expect(mockClose).toHaveBeenCalled();
    expect(mockCloseAllConnections).toHaveBeenCalled();
    expect(mockReleaseMultiInstancePort).toHaveBeenCalled();
  });
});
