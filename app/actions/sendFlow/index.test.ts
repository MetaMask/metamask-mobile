import { Hex } from '@metamask/utils';
import {
  SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID,
  setTransactionSendFlowContextualChainId,
} from './index';

describe('SendFlow Actions', () => {
  describe('setTransactionSendFlowContextualChainId', () => {
    it('should create action with chain ID', () => {
      const chainId: Hex = '0x1';
      const expectedAction = {
        type: SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID,
        chainId,
      };

      expect(setTransactionSendFlowContextualChainId(chainId)).toEqual(
        expectedAction,
      );
    });

    it('should handle different chain ID formats', () => {
      const testCases: { input: Hex; expected: Hex }[] = [
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

    it('should handle common network chain IDs', () => {
      const networkChainIds: { name: string; chainId: Hex }[] = [
        { name: 'Ethereum Mainnet', chainId: '0x1' },
        { name: 'Polygon', chainId: '0x89' },
        { name: 'BSC', chainId: '0x38' },
        { name: 'Avalanche', chainId: '0xa86a' },
        { name: 'Arbitrum', chainId: '0xa4b1' },
      ];

      networkChainIds.forEach(({ chainId }) => {
        const action = setTransactionSendFlowContextualChainId(chainId);
        expect(action.chainId).toBe(chainId);
        expect(action.type).toBe(SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID);
      });
    });
  });
});
