import { ConnectionStore } from './connection-store';
import { Connection } from '../types/connection';

describe('ConnectionStore', () => {
  let store: ConnectionStore;

  beforeEach(() => {
    store = new ConnectionStore();
  });

  it('dummy tests for scaffolding, will be replaced with real tests', () => {
    expect(store).toBeDefined();
    expect(store.save({} as Connection)).resolves.not.toThrow();
    expect(store.get('test-id')).resolves.toBeNull();
    expect(store.list()).resolves.toEqual([]);
    expect(store.delete('test-id')).resolves.not.toThrow();
  });
});
