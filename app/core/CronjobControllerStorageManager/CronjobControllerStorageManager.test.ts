import { SnapId } from '@metamask/snaps-sdk';
import ReduxService, { ReduxStore } from '../redux';
import { CronjobControllerStorageManager } from './CronjobControllerStorageManager';

describe('CronjobControllerStorageManager', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ReduxService.store = {
      dispatch: jest.fn(),
      getState: jest.fn(() => ({
        // Mock the initial state for CronjobController
        cronjobController: { storage: { events: {} } },
      })),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
    } as unknown as ReduxStore;
  });

  describe('getInitialState', () => {
    it('returns initial controller state', async () => {
      const manager = new CronjobControllerStorageManager();

      const data = manager.getInitialState();

      expect(data).toStrictEqual({ events: {} });
    });
  });

  describe('set', () => {
    it('sets state', async () => {
      const manager = new CronjobControllerStorageManager();

      const cronjobControllerState = {
        events: {
          foo: {
            id: 'foo',
            scheduledAt: '1234567890',
            snapId: 'snapId' as SnapId,
            date: '2023-10-01T00:00:00Z',
            recurring: true,
            schedule: '0 0 * * *',
            request: {
              method: 'testMethod',
            },
          },
        },
      };

      manager.set(cronjobControllerState);

      expect(ReduxService.store.dispatch).toHaveBeenCalledWith({
        type: 'cronjobController/setCronjobControllerState',
        payload: cronjobControllerState,
      });
    });
  });
});
