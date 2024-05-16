import reducer, { initialState } from './index';

const emptyAction = { type: '', origin: '' };

describe('requests reducer', () => {
  it('should return initial state', () => {
    const state = reducer(undefined, emptyAction);
    expect(state).toEqual(initialState);
  });

  it('should not mutate current state', () => {
    expect(() => {
      'use strict';
      const state = reducer(undefined, emptyAction);
      Object.freeze(state.rejections);
      const state2 = reducer(state, {
        type: 'RECORD_REJECTION_TO_REQUEST_FROM_ORIGIN',
        origin: 'www.test.com',
      });
      Object.freeze(state2.rejections);
      const state3 = reducer(state2, {
        type: 'RESET_REJECTIONS_TO_REQUEST_FROM_ORIGIN',
        origin: 'www.test.com',
      });
      Object.freeze(state3.rejections);
      reducer(state2, {
        type: 'RESET_ALL_REJECTIONS_TO_REQUEST',
        origin: 'www.test.com',
      });
    }).not.toThrow();
  });

  describe('actions', () => {
    it('should record new rejection', () => {
      const state = reducer(undefined, emptyAction);
      const state2 = reducer(state, {
        type: 'RECORD_REJECTION_TO_REQUEST_FROM_ORIGIN',
        origin: 'www.test.com',
      });
      expect(state2.rejections['www.test.com']).toBeDefined();
    });

    it('should reset rejections from origin', () => {
      const state = reducer(undefined, emptyAction);
      const state2 = reducer(state, {
        type: 'RECORD_REJECTION_TO_REQUEST_FROM_ORIGIN',
        origin: 'www.test.com',
      });
      const state3 = reducer(state2, {
        type: 'RESET_REJECTIONS_TO_REQUEST_FROM_ORIGIN',
        origin: 'www.test.com',
      });
      expect(state3.rejections['www.test.com']).not.toBeDefined();
    });

    it('should reset all rejections', () => {
      const state = reducer(undefined, emptyAction);
      const state2 = reducer(state, {
        type: 'RECORD_REJECTION_TO_REQUEST_FROM_ORIGIN',
        origin: 'www.test1.com',
      });
      const state3 = reducer(state2, {
        type: 'RECORD_REJECTION_TO_REQUEST_FROM_ORIGIN',
        origin: 'www.test2.com',
      });
      const state4 = reducer(state3, {
        type: 'RESET_ALL_REJECTIONS_TO_REQUEST',
        origin: 'www.test.com',
      });
      expect(Object.keys(state4.rejections)).toHaveLength(0);
    });
  });
});
