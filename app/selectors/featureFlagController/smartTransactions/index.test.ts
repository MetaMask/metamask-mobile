import {
  selectAllowedSmartTransactionsRpcHosts,
  SMART_TRANSACTIONS_ALLOWED_RPC_HOSTS_FLAG,
  DEFAULT_SMART_TRANSACTIONS_ALLOWED_RPC_HOSTS,
} from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

const getMockedFeatureFlag = (hosts: string | string[] = []) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          [SMART_TRANSACTIONS_ALLOWED_RPC_HOSTS_FLAG]: hosts,
        },
        cacheTimestamp: 0,
      },
    },
  },
});

describe('selectAllowedSmartTransactionsRpcHosts', () => {
  it('returns the default allowed RPC hosts if the flag state is undefined', () => {
    expect(
      selectAllowedSmartTransactionsRpcHosts(mockedUndefinedFlagsState),
    ).toEqual(DEFAULT_SMART_TRANSACTIONS_ALLOWED_RPC_HOSTS);
  });
  it('returns the default allowed RPC hosts if the flag is not set', () => {
    expect(
      selectAllowedSmartTransactionsRpcHosts(mockedEmptyFlagsState),
    ).toEqual(DEFAULT_SMART_TRANSACTIONS_ALLOWED_RPC_HOSTS);
  });
  it('returns the allowed RPC hosts if the flag is set', () => {
    expect(
      selectAllowedSmartTransactionsRpcHosts(
        getMockedFeatureFlag(['example.com']),
      ),
    ).toEqual(['example.com']);
  });
  it('returns the default allowed RPC hosts if the flag is set to an empty array', () => {
    expect(
      selectAllowedSmartTransactionsRpcHosts(getMockedFeatureFlag([])),
    ).toEqual(DEFAULT_SMART_TRANSACTIONS_ALLOWED_RPC_HOSTS);
  });
  it('returns the allowed RPC hosts if the flag is set to an array of strings', () => {
    expect(
      selectAllowedSmartTransactionsRpcHosts(
        getMockedFeatureFlag(['mainnet.base.org', 'rpc.linea.build']),
      ),
    ).toEqual(['mainnet.base.org', 'rpc.linea.build']);
  });
  it('returns the default allowed RPC hosts if the flag is set to a non-array value', () => {
    expect(
      selectAllowedSmartTransactionsRpcHosts(
        getMockedFeatureFlag('mainnet.base.org'),
      ),
    ).toEqual(DEFAULT_SMART_TRANSACTIONS_ALLOWED_RPC_HOSTS);
  });
});
