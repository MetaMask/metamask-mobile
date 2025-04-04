import ReduxService from './ReduxService';
import Logger from '../../util/Logger';
import type { ReduxStore } from './types';

describe('ReduxService', () => {
  let mockStore: ReduxStore;

  beforeEach(() => {
    // Reset any internal state
    jest.clearAllMocks();

    // Create a mock store
    mockStore = {
      dispatch: jest.fn(),
      getState: jest.fn(),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
    } as unknown as ReduxStore;

    // Spy on Logger
    jest.spyOn(Logger, 'error');
  });

  describe('store getter', () => {
    it('should throw error if store does not exist', () => {
      expect(() => ReduxService.store).toThrow('Redux store does not exist!');
      expect(Logger.error).toHaveBeenCalledWith(
        new Error('Redux store does not exist!'),
      );
    });

    it('should return store if it exists', () => {
      ReduxService.store = mockStore;
      expect(ReduxService.store).toBe(mockStore);
    });
  });

  describe('store setter', () => {
    it('should throw error if store is invalid', () => {
      const invalidStore = {} as ReduxStore;

      expect(() => {
        ReduxService.store = invalidStore;
      }).toThrow('Redux store is not a valid store!');

      expect(Logger.error).toHaveBeenCalledWith(
        new Error('Redux store is not a valid store!'),
      );
    });

    it('should set store if valid', () => {
      ReduxService.store = mockStore;
      expect(ReduxService.store).toBe(mockStore);
    });

    it('should validate store has required methods', () => {
      const incompleteStore = {
        dispatch: jest.fn(),
        // missing getState
      } as unknown as ReduxStore;

      expect(() => {
        ReduxService.store = incompleteStore;
      }).toThrow('Redux store is not a valid store!');
    });
  });
});
