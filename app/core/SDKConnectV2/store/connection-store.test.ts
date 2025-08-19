import { ConnectionStore } from './connection-store';

describe('ConnectionStore', () => {
  let store: ConnectionStore;

  beforeEach(() => {
    store = new ConnectionStore();
  });

  describe('dummy tests for scaffolding, will be replaced with real tests', () => {
    it('should be defined', () => {
      expect(store).toBeDefined();
    });

    it('should save a connection', () => {
      expect(store.save).toBeDefined();
    });

    it('should get a connection', () => {
      expect(store.get).toBeDefined();
    });

    it('should list connections', () => {
      expect(store.list).toBeDefined();
    });

    it('should delete a connection', () => {
      expect(store.delete).toBeDefined();
    });
  });
});
