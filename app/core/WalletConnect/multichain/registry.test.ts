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
import { solanaAdapter } from './solana';
import { tronAdapter } from './tron';

describe('multichain/registry', () => {
  it('registers the solana adapter under the solana CAIP-2 namespace', () => {
    expect(getAdapter('solana')).toBe(solanaAdapter);
  });

  it('registers the tron adapter under the tron CAIP-2 namespace', () => {
    expect(getAdapter('tron')).toBe(tronAdapter);
  });

  it('returns undefined for namespaces that have no registered adapter', () => {
    expect(getAdapter('eip155')).toBeUndefined();
    expect(getAdapter('cosmos')).toBeUndefined();
  });

  it('exposes the solana and tron namespaces via getAllRegisteredNamespaces', () => {
    expect(getAllRegisteredNamespaces()).toEqual(
      expect.arrayContaining(['solana', 'tron']),
    );
  });

  it('exposes the solana and tron adapters via getAllAdapters', () => {
    const adapters = getAllAdapters();

    expect(adapters).toEqual(
      expect.arrayContaining([solanaAdapter, tronAdapter]),
    );
  });
});
