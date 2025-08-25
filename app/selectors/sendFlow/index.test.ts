import { RootState } from '../../reducers';
import initialRootState from '../../util/test/initial-root-state';
import { selectSendFlowContextualChainId } from './index';

describe('sendFlow selectors', () => {
  const initialState: RootState = {
    ...initialRootState,
    networkOnboarded: {
      sendFlowChainId: '0x1',
    },
  };
  describe('selectSendFlowContextualChainId', () => {
    it('should return contextual chain ID when present', () => {
      const result = selectSendFlowContextualChainId(initialState);
      expect(result).toBe('0x1');
    });

    it('should return null when contextual chain ID is not set', () => {
      const state = {
        ...initialState,
        networkOnboarded: {
          sendFlowChainId: null,
        },
      };

      const result = selectSendFlowContextualChainId(
        state as unknown as RootState,
      );
      expect(result).toBeNull();
    });

    it('should return undefined when networkOnboarded is not present', () => {
      const state = {
        ...initialState,
        networkOnboarded: {
          sendFlowChainId: undefined,
        },
      };

      const result = selectSendFlowContextualChainId(state);
      expect(result).toBeUndefined();
    });

    it('should return undefined when state is null', () => {
      const result = selectSendFlowContextualChainId(
        null as unknown as RootState,
      );
      expect(result).toBeUndefined();
    });

    it('should return undefined when state is undefined', () => {
      const result = selectSendFlowContextualChainId(
        undefined as unknown as RootState,
      );
      expect(result).toBeUndefined();
    });

    it('should handle different chain ID formats', () => {
      const testCases = [
        { chainId: '0x1', expected: '0x1' },
        { chainId: '0xa86a', expected: '0xa86a' },
        { chainId: '0xaa36a7', expected: '0xaa36a7' },
        { chainId: '', expected: '' },
      ];

      testCases.forEach(({ chainId, expected }) => {
        const state = {
          ...initialState,
          networkOnboarded: {
            sendFlowChainId: chainId,
          },
        };

        const result = selectSendFlowContextualChainId(state);
        expect(result).toBe(expected);
      });
    });
  });
});
