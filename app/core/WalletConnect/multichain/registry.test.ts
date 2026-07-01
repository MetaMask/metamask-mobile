jest.mock('../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AccountsController: {
        listAccounts: jest.fn().mockReturnValue([]),
      },
    },
  },
}));

jest.mock('../../Permissions', () => ({
  addPermittedAccounts: jest.fn(),
}));

jest.mock('../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

import {
  getAdapter,
  getAllAdapters,
  getAllRegisteredNamespaces,
} from './registry';
import { bitcoinAdapter } from './bitcoin';
import { tronAdapter } from './tron';

describe('multichain/registry', () => {
  it('registers the tron adapter under the tron CAIP-2 namespace', () => {
    expect(getAdapter('tron')).toBe(tronAdapter);
  });

  it('registers the bitcoin adapter under the bip122 CAIP-2 namespace', () => {
    expect(getAdapter('bip122')).toBe(bitcoinAdapter);
  });

  it('returns undefined for namespaces that have no registered adapter', () => {
    expect(getAdapter('eip155')).toBeUndefined();
    expect(getAdapter('cosmos')).toBeUndefined();
  });

  it('exposes the tron namespace via getAllRegisteredNamespaces', () => {
    expect(getAllRegisteredNamespaces()).toContain('tron');
    expect(getAllRegisteredNamespaces()).toContain('bip122');
  });

  it('exposes the tron adapter via getAllAdapters', () => {
    const adapters = getAllAdapters();

    expect(adapters).toContain(tronAdapter);
    expect(adapters).toContain(bitcoinAdapter);
  });
});
