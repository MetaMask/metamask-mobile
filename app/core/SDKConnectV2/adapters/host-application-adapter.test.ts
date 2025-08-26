import { HostApplicationAdapter } from './host-application-adapter';
import { Connection } from '../services/connection';
import { store } from '../../../store';
import { setSdkV2Connections } from '../../../actions/sdk';
import { SDKSessions } from '../../../core/SDKConnect/SDKConnect';

jest.mock('../../../store', () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

jest.mock('../../../actions/sdk', () => ({
  setSdkV2Connections: jest.fn((connections) => ({
    type: 'SET_SDK_V2_CONNECTIONS',
    connections,
  })),
}));

const createMockConnection = (id: string, name: string): Connection =>
  ({
    id,
    metadata: {
      dapp: {
        name: `${name} DApp`,
        url: `https://testdapp${id}.com`,
        icon: `https://testdapp${id}.com/icon.png`,
      },
      sdk: {
        version: '2.1.0',
        platform: 'JavaScript',
      },
    },
  } as Connection);

describe('HostApplicationAdapter', () => {
  let adapter: HostApplicationAdapter;

  beforeEach(() => {
    (store.dispatch as jest.Mock).mockClear();
    (setSdkV2Connections as jest.Mock).mockClear();
    adapter = new HostApplicationAdapter();
  });

  it('dummy tests for scaffolding, will be replaced with real tests', () => {
    expect(adapter).toBeDefined();
    expect(() => adapter.showLoading()).not.toThrow();
    expect(() => adapter.hideLoading()).not.toThrow();
    expect(() => adapter.showOTPModal()).not.toThrow();
  });

  describe('syncConnectionList', () => {
    it('should correctly transform a single Connection object and dispatch it to the Redux store', () => {
      const mockConnection = createMockConnection('conn1', 'Test');
      const connections: Connection[] = [mockConnection];

      adapter.syncConnectionList(connections);

      const expectedSessions = {
        [mockConnection.id]: {
          id: mockConnection.id,
          otherPublicKey: '',
          origin: mockConnection.metadata.dapp.url,
          originatorInfo: {
            title: mockConnection.metadata.dapp.name,
            url: mockConnection.metadata.dapp.url,
            icon: mockConnection.metadata.dapp.icon,
            dappId: mockConnection.metadata.dapp.name,
            apiVersion: mockConnection.metadata.sdk.version,
            platform: mockConnection.metadata.sdk.platform,
          },
          connected: true,
          isV2: true,
        },
      } as unknown as SDKSessions;

      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(setSdkV2Connections).toHaveBeenCalledWith(expectedSessions);
      expect(store.dispatch).toHaveBeenCalledWith(
        setSdkV2Connections(expectedSessions),
      );
    });

    it('should handle an empty array by dispatching an empty object', () => {
      const connections: Connection[] = [];

      adapter.syncConnectionList(connections);

      const expectedSessions = {} as SDKSessions;
      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(setSdkV2Connections).toHaveBeenCalledWith(expectedSessions);
      expect(store.dispatch).toHaveBeenCalledWith(
        setSdkV2Connections(expectedSessions),
      );
    });

    it('should correctly transform an array of multiple Connection objects', () => {
      const mockConnection1 = createMockConnection('conn1', 'Test1');
      const mockConnection2 = createMockConnection('conn2', 'Test2');
      const connections: Connection[] = [mockConnection1, mockConnection2];

      adapter.syncConnectionList(connections);

      const expectedSessions = {
        [mockConnection1.id]: {
          id: mockConnection1.id,
          otherPublicKey: '',
          origin: mockConnection1.metadata.dapp.url,
          originatorInfo: {
            title: mockConnection1.metadata.dapp.name,
            url: mockConnection1.metadata.dapp.url,
            icon: mockConnection1.metadata.dapp.icon,
            dappId: mockConnection1.metadata.dapp.name,
            apiVersion: mockConnection1.metadata.sdk.version,
            platform: mockConnection1.metadata.sdk.platform,
          },
          connected: true,
          isV2: true,
        },
        [mockConnection2.id]: {
          id: mockConnection2.id,
          otherPublicKey: '',
          origin: mockConnection2.metadata.dapp.url,
          originatorInfo: {
            title: mockConnection2.metadata.dapp.name,
            url: mockConnection2.metadata.dapp.url,
            icon: mockConnection2.metadata.dapp.icon,
            dappId: mockConnection2.metadata.dapp.name,
            apiVersion: mockConnection2.metadata.sdk.version,
            platform: mockConnection2.metadata.sdk.platform,
          },
          connected: true,
          isV2: true,
        },
      } as unknown as SDKSessions;

      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(setSdkV2Connections).toHaveBeenCalledWith(expectedSessions);
    });
  });
});
