import {
  SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID,
  setTransactionSendFlowContextualChainId,
} from './index';

describe('SendFlow Actions', () => {
  describe('setTransactionSendFlowContextualChainId', () => {
    it('should create action with chain ID', () => {
      const chainId = '0x1';
      const expectedAction = {
        type: SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID,
        chainId,
      };

      expect(setTransactionSendFlowContextualChainId(chainId)).toEqual(
        expectedAction,
      );
    });

    it('should create action with null chain ID', () => {
      const expectedAction = {
        type: SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID,
        chainId: null,
      };

      expect(setTransactionSendFlowContextualChainId(null)).toEqual(
        expectedAction,
      );
    });

    it('should create action with undefined chain ID', () => {
      const expectedAction = {
        type: SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID,
        chainId: undefined,
      };

      expect(setTransactionSendFlowContextualChainId(undefined)).toEqual(
        expectedAction,
      );
    });

    it('should handle different chain ID formats', () => {
      const testCases = [
        { input: '0x1', expected: '0x1' },
        { input: '0xa', expected: '0xa' },
        { input: '0x38', expected: '0x38' },
        { input: '0x89', expected: '0x89' },
        { input: '0xa86a', expected: '0xa86a' },
      ];

      testCases.forEach(({ input, expected }) => {
        const action = setTransactionSendFlowContextualChainId(input);
        expect(action.chainId).toBe(expected);
        expect(action.type).toBe(SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID);
      });
    });

    it('should not modify the chain ID value', () => {
      const chainId = '0xInvalidButShouldPass';
      const action = setTransactionSendFlowContextualChainId(chainId);
      expect(action.chainId).toBe(chainId);
    });
  });
});
