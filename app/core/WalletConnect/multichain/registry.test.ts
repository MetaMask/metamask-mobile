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
import { tronAdapter } from './tron';

describe('multichain/registry', () => {
  it('registers the tron adapter under the tron CAIP-2 namespace', () => {
    expect(getAdapter('tron')).toBe(tronAdapter);
  });

  it('returns undefined for namespaces that have no registered adapter', () => {
    expect(getAdapter('eip155')).toBeUndefined();
    expect(getAdapter('cosmos')).toBeUndefined();
  });

  it('exposes the tron namespace via getAllRegisteredNamespaces', () => {
    expect(getAllRegisteredNamespaces()).toContain('tron');
  });

  it('exposes the tron adapter via getAllAdapters', () => {
    const adapters = getAllAdapters();

    expect(adapters).toContain(tronAdapter);
  });
});
