import { configureStore } from '@reduxjs/toolkit';
import cronjobControllerReducer, {
  CronjobControllerStorageState,
  selectCronjobControllerState,
  setCronjobControllerState,
} from '.';
import { SnapId } from '@metamask/snaps-sdk';
import { RootState } from '../../../../reducers';

interface MockRootState {
  cronjobController: CronjobControllerStorageState;
}

describe('cronjobControllerSlice', () => {
  let store: ReturnType<typeof configureStore<MockRootState>>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        cronjobController: cronjobControllerReducer,
      },
    });
  });

  describe('Initial State', () => {
    it('has the correct initial state', () => {
      const state = store.getState().cronjobController;
      expect(state).toEqual({
        storage: undefined,
      });
    });
  });

  describe('setCronjobControllerState', () => {
    it('updates the cronjob controller state', () => {
      const mockCronjobControllerState = {
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
      store.dispatch(setCronjobControllerState(mockCronjobControllerState));

      const state = store.getState().cronjobController;
      expect(state.storage).toEqual(mockCronjobControllerState);
    });
  });

  describe('selectCronjobControllerState', () => {
    it('selects the cronjob controller state', () => {
      const mockCronjobControllerState = {
        events: {
          bar: {
            id: 'bar',
            scheduledAt: '1234567891',
            snapId: 'snapId2' as SnapId,
            date: '2023-10-02T00:00:00Z',
            recurring: false,
            schedule: '0 0 * * *',
            request: {
              method: 'testMethod2',
            },
          },
        },
      };
      store.dispatch(setCronjobControllerState(mockCronjobControllerState));

      expect(
        selectCronjobControllerState(store.getState() as RootState),
      ).toEqual({ storage: mockCronjobControllerState });
    });
  });

  describe('selectCronjobControllerStorage', () => {
    it('selects the cronjob controller storage', () => {
      const mockCronjobControllerState = {
        events: {
          baz: {
            id: 'baz',
            scheduledAt: '1234567892',
            snapId: 'snapId3' as SnapId,
            date: '2023-10-03T00:00:00Z',
            recurring: true,
            schedule: '0 0 * * *',
            request: {
              method: 'testMethod3',
            },
          },
        },
      };
      store.dispatch(setCronjobControllerState(mockCronjobControllerState));

      expect(
        selectCronjobControllerState(store.getState() as RootState).storage,
      ).toEqual(mockCronjobControllerState);
    });
  });
});
