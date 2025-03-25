import reducer, {
  initialState,
  setSourceAmount,
  setDestAmount,
  setDestChainId,
  resetBridgeState,
  switchTokens,
} from '.';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { TokenI } from '../../../../components/UI/Tokens/types';

describe('bridge slice', () => {
  const mockToken: TokenI = {
    address: '0x123',
    symbol: 'ETH',
    decimals: 18,
    image: 'https://example.com/eth.png',
    chainId: 'eip155:1' as SupportedCaipChainId,
    aggregators: [],
    name: 'Ethereum',
    balance: '100',
    balanceFiat: '100',
    isETH: true,
    isNative: true,
    logo: 'https://example.com/eth.png',
  };

  const mockDestToken: TokenI = {
    address: '0x456',
    symbol: 'USDC',
    decimals: 6,
    image: 'https://example.com/usdc.png',
    chainId: 'eip155:2' as SupportedCaipChainId,
    aggregators: [],
    name: 'USDC',
    balance: '100',
    balanceFiat: '100',
    isETH: false,
    isNative: false,
    logo: 'https://example.com/usdc.png',
  };

  describe('initial state', () => {
    it('should have the correct initial state', () => {
      expect(initialState).toEqual({
        sourceAmount: undefined,
        destAmount: undefined,
        destChainId: undefined,
        sourceToken: undefined,
        destToken: undefined,
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

  describe('setDestChainId', () => {
    it('should set the destination chain ID', () => {
      const chainId = 'eip155:2' as SupportedCaipChainId;
      const action = setDestChainId(chainId);
      const state = reducer(initialState, action);

      expect(state.destChainId).toBe(chainId);
    });

    it('should set dest chain ID to undefined', () => {
      const action = setDestChainId(undefined);
      const state = reducer(initialState, action);

      expect(state.destChainId).toBeUndefined();
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

  describe('switchTokens', () => {
    it('should switch source and destination tokens when both are defined', () => {
      const state = {
        ...initialState,
        sourceToken: mockToken,
        destToken: mockDestToken,
        destChainId: 'eip155:2' as SupportedCaipChainId,
        sourceAmount: '1.5',
        destAmount: '100',
      };

      const action = switchTokens();
      const newState = reducer(state, action);

      expect(newState.sourceToken).toEqual(mockDestToken);
      expect(newState.destToken).toEqual(mockToken);
      expect(newState.destChainId).toBe('eip155:2');
      expect(newState.sourceAmount).toBeUndefined();
      expect(newState.destAmount).toBeUndefined();
    });

    it('should not switch tokens when destination token is undefined', () => {
      const state = {
        ...initialState,
        sourceToken: mockToken,
        destToken: undefined,
        destChainId: undefined,
        sourceAmount: '1.5',
        destAmount: undefined,
      };

      const action = switchTokens();
      const newState = reducer(state, action);

      expect(newState).toEqual(state);
    });

    it('should not switch tokens when destination chain is undefined', () => {
      const state = {
        ...initialState,
        sourceToken: mockToken,
        destToken: mockDestToken,
        destChainId: undefined,
        sourceAmount: '1.5',
        destAmount: '100',
      };

      const action = switchTokens();
      const newState = reducer(state, action);

      expect(newState).toEqual(state);
    });
  });
});
