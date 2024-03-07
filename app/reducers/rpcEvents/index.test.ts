import { ActionType, iEventAction } from '../../actions/rpcEvents';
import reducer, { RPCStageTypes, iEventGroup, isWhitelistedRPC } from './index';

const emptyAction: iEventAction = {
  type: null,
  rpcName: '',
};

const intialState: Readonly<iEventGroup> = {
  signingEvent: {
    eventStage: RPCStageTypes.IDLE,
    rpcName: '',
  },
};

describe('rpcEvents reducer', () => {
  describe('isWhiteListedRPC', () => {
    it('isWhitelistedRPC should return true for whitelisted origin', () => {
      expect(isWhitelistedRPC('eth_sign')).toEqual(true);
      expect(isWhitelistedRPC('personal_sign')).toEqual(true);
      expect(isWhitelistedRPC('eth_signTypedData')).toEqual(true);
      expect(isWhitelistedRPC('eth_signTypedData_v3')).toEqual(true);
      expect(isWhitelistedRPC('eth_signTypedData_v4')).toEqual(true);
    });

    it('isWhitelistedRPC should return false for non whitelisted origin', () => {
      expect(isWhitelistedRPC('eth_sendTransaction')).toEqual(false);
      expect(isWhitelistedRPC('eth_requestAccounts')).toEqual(false);
      expect(isWhitelistedRPC('eth_accounts')).toEqual(false);
    });
  });

  describe('reducer', () => {
    it('should return the initial state', () => {
      expect(reducer(undefined, emptyAction)).toEqual(intialState);
    });

    it('EventGroup is not in whitelist', () => {
      const state = reducer(undefined, emptyAction);
      const action = {
        type: ActionType.SET_EVENT_STAGE,
        rpcName: 'eth_sendTransaction',
        eventStage: RPCStageTypes.REQUEST_SEND,
      };
      expect(reducer(state, action)).toEqual(state);
    });

    it('should set event stage', () => {
      const state = reducer(undefined, emptyAction);
      const action = {
        type: ActionType.SET_EVENT_STAGE,
        rpcName: 'eth_sign',
        eventStage: RPCStageTypes.REQUEST_SEND,
      };
      expect(reducer(state, action)).toEqual({
        signingEvent: {
          eventStage: RPCStageTypes.REQUEST_SEND,
          rpcName: 'eth_sign',
        },
      });
    });

    it('should reset event stage', () => {
      const state = reducer(undefined, emptyAction);
      const action = {
        type: ActionType.RESET_EVENT_STATE,
        rpcName: 'eth_sign',
      };
      expect(reducer(state, action)).toEqual({
        signingEvent: {
          eventStage: RPCStageTypes.IDLE,
          rpcName: '',
        },
      });
    });

    it('should set event error', () => {
      const state = reducer(undefined, emptyAction);
      const action = {
        type: ActionType.SET_EVENT_ERROR,
        rpcName: 'eth_sign',
        error: new Error('Error'),
      };
      expect(reducer(state, action)).toEqual({
        signingEvent: {
          eventStage: RPCStageTypes.ERROR,
          rpcName: 'eth_sign',
          error: new Error('Error'),
        },
      });
    });

    it('should return default state if action type is unknown', () => {
      const state = reducer(undefined, emptyAction);
      const action = {
        type: 'UNKNOWN',
        rpcName: 'eth_sign',
      };
      expect(reducer(state, action)).toEqual(state);
    });
  });
});
