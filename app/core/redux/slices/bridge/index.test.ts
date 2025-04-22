import reducer, {
  initialState,
  setSourceAmount,
  setDestAmount,
  resetBridgeState,
  setSlippage,
} from '.';
import { BridgeToken } from '../../../../components/UI/Bridge/types';
import { Hex } from '@metamask/utils';

describe('bridge slice', () => {
  const mockToken: BridgeToken = {
    address: '0x123',
    symbol: 'ETH',
    decimals: 18,
    image: 'https://example.com/eth.png',
    chainId: '0x1' as Hex,
    name: 'Ethereum',
    balance: '100',
    balanceFiat: '100',
  };

  const mockDestToken: BridgeToken = {
    address: '0x456',
    symbol: 'USDC',
    decimals: 6,
    image: 'https://example.com/usdc.png',
    chainId: '0x2' as Hex,
    name: 'USDC',
    balance: '100',
    balanceFiat: '100',
  };

  describe('initial state', () => {
    it('should have the correct initial state', () => {
      expect(initialState).toEqual({
        sourceAmount: undefined,
        destAmount: undefined,
        destChainId: undefined,
        sourceToken: undefined,
        destToken: undefined,
        slippage: '0.5',
      });
    });
  });

  describe('setSourceAmount', () => {
    it('should set the source amount', () => {
      const amount = '1.5';
      const action = setSourceAmount(amount);
      const state = reducer(initialState, action);

      expect(state.sourceAmount).toBe(amount);
    });

    it('should set source amount to undefined', () => {
      const action = setSourceAmount(undefined);
      const state = reducer(initialState, action);

      expect(state.sourceAmount).toBeUndefined();
    });
  });

  describe('setSlippage', () => {
    it('should set the slippage', () => {
      const slippage = '0.5';
      const action = setSlippage(slippage);
      const state = reducer(initialState, action);

      expect(state.slippage).toBe(slippage);
    });
  });

  describe('setDestAmount', () => {
    it('should set the destination amount', () => {
      const amount = '100';
      const action = setDestAmount(amount);
      const state = reducer(initialState, action);

      expect(state.destAmount).toBe(amount);
    });

    it('should set dest amount to undefined', () => {
      const action = setDestAmount(undefined);
      const state = reducer(initialState, action);

      expect(state.destAmount).toBeUndefined();
    });
  });

  describe('resetBridgeState', () => {
    it('should reset the state to initial state', () => {
      const state = {
        ...initialState,
        sourceAmount: '1.5',
        destAmount: '100',
        sourceToken: mockToken,
        destToken: mockDestToken,
      };

      const action = resetBridgeState();
      const newState = reducer(state, action);

      expect(newState).toEqual(initialState);
    });
  });
});
