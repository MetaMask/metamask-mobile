import { SnapId } from '@metamask/snaps-sdk';
import ReduxService from '../redux';
import { CronjobControllerStorageManager } from './CronjobControllerStorageManager';
import configureStore from '../../util/test/configureStore';
import { setCronjobControllerState } from '../redux/slices/cronjobController';

describe('CronjobControllerStorageManager', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ReduxService.store = configureStore({
      cronjobController: {
        storage: { events: {} },
      },
    });
  });

  describe('getInitialState', () => {
    it('returns initial controller state', async () => {
      const manager = new CronjobControllerStorageManager();

      const data = manager.getInitialState();

      expect(data).toStrictEqual({ events: {} });
    });

    it('returns initial controller state with existing values', async () => {
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

      const data = manager.getInitialState();

      expect(data).toStrictEqual(cronjobControllerState);
    });
  });

  describe('set', () => {
    it('sets state', async () => {
      const dispatchSpy = jest.spyOn(ReduxService.store, 'dispatch');

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

      expect(dispatchSpy).toHaveBeenCalledWith(
        setCronjobControllerState(cronjobControllerState),
      );
    });
  });
});
