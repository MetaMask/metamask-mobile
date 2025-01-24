import { RPCStageTypes } from '../../reducers/rpcEvents';
import {
  ActionType,
  resetEventStage,
  setEventStage,
  setEventStageError,
} from '.';

describe('action, rpcEvents', () => {
  describe('setEventStage', () => {
    const createExpectedAction = (eventStage: RPCStageTypes) => ({
      type: ActionType.SET_EVENT_STAGE,
      rpcName: 'eth_signTypedData',
      eventStage,
    });

    it('should create an action to set event stage to REQUEST_SENT', () => {
      expect(setEventStage('eth_signTypedData', RPCStageTypes.REQUEST_SEND)).toEqual(
        createExpectedAction(RPCStageTypes.REQUEST_SEND),
      );
    });

    it('should create an action to set event stage to COMPLETE', () => {
      expect(setEventStage('eth_signTypedData', RPCStageTypes.COMPLETE)).toEqual(
        createExpectedAction(RPCStageTypes.COMPLETE),
      );
    });
  });

  describe('resetEventStage', () => {
    it('should create an action to reset the event stage', () => {
      const expectedAction = {
        type: ActionType.RESET_EVENT_STATE,
        rpcName: 'eth_signTypedData',
      };
      expect(resetEventStage('eth_signTypedData')).toEqual(expectedAction);
    });
  });

  describe('setEventStageError', () => {
    it('should create an action to set the event stage error', () => {
      const expectedAction = {
        type: ActionType.SET_EVENT_ERROR,
        rpcName: 'eth_signTypedData',
        eventStage: RPCStageTypes.ERROR,
        error: new Error('test error'),
      };
      expect(setEventStageError('eth_signTypedData', new Error('test error'))).toEqual(
        expectedAction,
      );
    });
  });
});
