import { getGaslessBridgeWith7702EnabledForChain } from './smartTransactionsController';

jest.mock('./smartTransactionsController', () => ({
  getGaslessBridgeWith7702EnabledForChain: jest.fn().mockReturnValue(false),
}));

import { initialState } from '../core/redux/slices/bridge';
import {
  selectGasIncludedQuoteParams,
  selectIsGasIncluded7702BridgeEnabled,
} from './bridge';
import { BridgeToken } from '../components/UI/Bridge/types';
import { Hex } from '@metamask/utils';
import { RootState } from '../reducers';

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

describe('bridge selectors', () => {
  describe('selectIsGasIncluded7702BridgeEnabled', () => {
    beforeEach(() => {
      jest
        .mocked(getGaslessBridgeWith7702EnabledForChain)
        .mockReturnValue(false);
    });

    it('returns false when sourceToken is undefined', () => {
      const mockState = {
        bridge: { ...initialState, sourceToken: undefined },
      } as RootState;

      expect(selectIsGasIncluded7702BridgeEnabled(mockState)).toBe(false);
    });

    it('returns false when sourceToken has no chainId', () => {
      const mockState = {
        bridge: {
          ...initialState,
          sourceToken: { ...mockToken, chainId: undefined },
        },
      } as unknown as RootState;

      expect(selectIsGasIncluded7702BridgeEnabled(mockState)).toBe(false);
    });

    it('delegates to getGaslessBridgeWith7702EnabledForChain for EVM chains', () => {
      jest
        .mocked(getGaslessBridgeWith7702EnabledForChain)
        .mockReturnValue(true);

      const mockState = {
        bridge: { ...initialState, sourceToken: mockToken },
      } as RootState;

      expect(selectIsGasIncluded7702BridgeEnabled(mockState)).toBe(true);
      expect(getGaslessBridgeWith7702EnabledForChain).toHaveBeenCalledWith(
        mockState,
        mockToken.chainId,
      );
    });
  });

  describe('selectGasIncludedQuoteParams', () => {
    beforeEach(() => {
      selectGasIncludedQuoteParams.resetRecomputations();
      jest
        .mocked(getGaslessBridgeWith7702EnabledForChain)
        .mockReturnValue(false);
    });

    it('returns gasIncluded true with 7702 false when STX send bundle is supported', () => {
      const mockState = {
        bridge: {
          ...initialState,
          isGasIncludedSTXSendBundleSupported: true,
          isGasIncluded7702Supported: true,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: true, gasIncluded7702: false });
    });

    it('returns gasIncluded true with 7702 true for swap when 7702 is supported', () => {
      const mockState = {
        bridge: {
          ...initialState,
          sourceToken: mockToken,
          destToken: { ...mockDestToken, chainId: mockToken.chainId },
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: true,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: true, gasIncluded7702: true });
    });

    it('returns gasIncluded false with 7702 false for swap without 7702 support', () => {
      const mockState = {
        bridge: {
          ...initialState,
          sourceToken: mockToken,
          destToken: { ...mockDestToken, chainId: mockToken.chainId },
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: false,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: false, gasIncluded7702: false });
    });

    it('returns gasIncluded false with 7702 false for bridge mode if disabled via flag', () => {
      const mockState = {
        bridge: {
          ...initialState,
          sourceToken: mockToken,
          destToken: mockDestToken,
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: true,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: false, gasIncluded7702: false });
    });

    it('returns gasIncluded and gasIncluded7702 true for bridge when gaslessBridgeWith7702Enabled flag is true and 7702 relay supported', () => {
      jest
        .mocked(getGaslessBridgeWith7702EnabledForChain)
        .mockReturnValue(true);

      const mockState = {
        bridge: {
          ...initialState,
          sourceToken: mockToken,
          destToken: mockDestToken,
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: true,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: true, gasIncluded7702: true });
    });

    it('returns gasIncluded false for bridge when flag is true but 7702 relay not supported', () => {
      jest
        .mocked(getGaslessBridgeWith7702EnabledForChain)
        .mockReturnValue(true);

      const mockState = {
        bridge: {
          ...initialState,
          sourceToken: mockToken,
          destToken: mockDestToken,
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: false,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: false, gasIncluded7702: false });
    });

    it('returns gasIncluded false for bridge when flag is false even with 7702 relay supported', () => {
      jest
        .mocked(getGaslessBridgeWith7702EnabledForChain)
        .mockReturnValue(false);

      const mockState = {
        bridge: {
          ...initialState,
          sourceToken: mockToken,
          destToken: mockDestToken,
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: true,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: false, gasIncluded7702: false });
    });

    it('STX send bundle takes priority over bridge flag', () => {
      jest
        .mocked(getGaslessBridgeWith7702EnabledForChain)
        .mockReturnValue(true);

      const mockState = {
        bridge: {
          ...initialState,
          sourceToken: mockToken,
          destToken: mockDestToken,
          isGasIncludedSTXSendBundleSupported: true,
          isGasIncluded7702Supported: true,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: true, gasIncluded7702: false });
    });
  });
});
