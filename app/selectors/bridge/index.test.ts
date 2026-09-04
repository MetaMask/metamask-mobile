import { isCrossChain } from '@metamask/bridge-controller';
import { getMemoizedInternalAccountByAddress } from '../accountsController';
import { selectSelectedInternalAccountByScope } from '../multichainAccounts/accounts';
import { getIsAssetRequireActivate } from '../stellar/stellar-assets';
import { getGaslessBridgeWith7702EnabledForChain } from '../smartTransactionsController';

jest.mock('../smartTransactionsController', () => ({
  getGaslessBridgeWith7702EnabledForChain: jest.fn().mockReturnValue(false),
}));

jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    isCrossChain: jest.fn(actual.isCrossChain),
  };
});

jest.mock('../accountsController', () => {
  const actual = jest.requireActual('../accountsController');
  return {
    ...actual,
    getMemoizedInternalAccountByAddress: jest.fn(
      actual.getMemoizedInternalAccountByAddress,
    ),
  };
});

jest.mock('../multichainAccounts/accounts', () => {
  const actual = jest.requireActual('../multichainAccounts/accounts');
  return {
    ...actual,
    selectSelectedInternalAccountByScope: jest.fn(
      actual.selectSelectedInternalAccountByScope,
    ),
  };
});

jest.mock('../stellar/stellar-assets', () => {
  const actual = jest.requireActual('../stellar/stellar-assets');
  return {
    ...actual,
    getIsAssetRequireActivate: jest.fn(actual.getIsAssetRequireActivate),
  };
});

import { initialState as bridgeInitialState } from '../../core/redux/slices/bridge';
import {
  selectBatchSellSourceWalletAddress,
  selectGasIncludedQuoteParams,
  selectIsDestAssetRequireActivate,
  selectIsDestSameAsActiveAccount,
  selectIsGasIncluded7702BridgeEnabled,
  selectSourceWalletAddress,
  selectValidDestInternalAccountIds,
} from './';
import { BridgeToken } from '../../components/UI/Bridge/types';
import { Hex } from '@metamask/utils';
import { RootState } from '../../reducers';
import {
  evmAccountAddress,
  evmAccountId,
  initialState as bridgeSelectorInitialState,
  solanaAccountAddress,
  solanaAccountId,
  solanaNativeTokenAddress,
} from '../../components/UI/Bridge/_mocks_/initialState';
import { SolScope, XlmScope } from '@metamask/keyring-api';
import { createMockToken } from '../../components/UI/Bridge/testUtils';

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

const mockSolanaToken: BridgeToken = {
  ...mockToken,
  address: solanaNativeTokenAddress,
  symbol: 'SOL',
  chainId: SolScope.Mainnet,
  name: 'Solana',
};

const selectorInitialState = bridgeSelectorInitialState as unknown as RootState;

function createSelectorState(
  bridgeOverrides: Partial<RootState['bridge']> = {},
): RootState {
  return {
    ...selectorInitialState,
    bridge: {
      ...selectorInitialState.bridge,
      ...bridgeOverrides,
    },
  };
}

describe('bridge selectors', () => {
  describe('selectSourceWalletAddress', () => {
    beforeEach(() => {
      selectSourceWalletAddress.clearCache();
      selectSourceWalletAddress.memoizedResultFunc.clearCache();
      selectSourceWalletAddress.resetRecomputations();
    });

    it('returns undefined when the source token is missing', () => {
      expect(selectSourceWalletAddress(createSelectorState())).toBeUndefined();
    });

    it.each([
      ['EVM', mockToken, evmAccountAddress],
      ['non-EVM', mockSolanaToken, solanaAccountAddress],
    ])(
      'returns the selected account group address for the %s source token',
      (_label, sourceToken, expectedAddress) => {
        const state = createSelectorState({ sourceToken });

        expect(selectSourceWalletAddress(state)).toBe(expectedAddress);
      },
    );

    it('does not recompute for unrelated state changes but does for a source token change', () => {
      const state = createSelectorState({
        sourceToken: mockToken,
        sourceAmount: '1',
      });
      const firstResult = selectSourceWalletAddress(state);
      const recomputations = selectSourceWalletAddress.recomputations();
      const unrelatedState = {
        ...state,
        bridge: {
          ...state.bridge,
          sourceAmount: '2',
        },
      };

      const secondResult = selectSourceWalletAddress(unrelatedState);

      expect(secondResult).toBe(firstResult);
      expect(selectSourceWalletAddress.recomputations()).toBe(recomputations);

      const changedTokenState = {
        ...unrelatedState,
        bridge: {
          ...unrelatedState.bridge,
          sourceToken: mockSolanaToken,
        },
      };

      expect(selectSourceWalletAddress(changedTokenState)).toBe(
        solanaAccountAddress,
      );
      expect(selectSourceWalletAddress.recomputations()).toBe(
        recomputations + 1,
      );
    });
  });

  describe('selectBatchSellSourceWalletAddress', () => {
    beforeEach(() => {
      selectBatchSellSourceWalletAddress.clearCache();
      selectBatchSellSourceWalletAddress.memoizedResultFunc.clearCache();
      selectBatchSellSourceWalletAddress.resetRecomputations();
    });

    it('returns undefined when the batch has no source tokens', () => {
      expect(
        selectBatchSellSourceWalletAddress(createSelectorState()),
      ).toBeUndefined();
    });

    it('returns the account address for the first batch source token', () => {
      const state = createSelectorState({
        batchSellSourceTokens: [mockSolanaToken, mockToken],
      });

      expect(selectBatchSellSourceWalletAddress(state)).toBe(
        solanaAccountAddress,
      );
    });

    it('does not recompute for unrelated state changes but does for a batch token change', () => {
      const state = createSelectorState({
        batchSellSourceTokens: [mockToken],
        sourceAmount: '1',
      });
      const firstResult = selectBatchSellSourceWalletAddress(state);
      const recomputations =
        selectBatchSellSourceWalletAddress.recomputations();
      const unrelatedState = {
        ...state,
        bridge: {
          ...state.bridge,
          sourceAmount: '2',
        },
      };

      const secondResult = selectBatchSellSourceWalletAddress(unrelatedState);

      expect(secondResult).toBe(firstResult);
      expect(selectBatchSellSourceWalletAddress.recomputations()).toBe(
        recomputations,
      );

      const changedTokenState = {
        ...unrelatedState,
        bridge: {
          ...unrelatedState.bridge,
          batchSellSourceTokens: [mockSolanaToken],
        },
      };

      expect(selectBatchSellSourceWalletAddress(changedTokenState)).toBe(
        solanaAccountAddress,
      );
      expect(selectBatchSellSourceWalletAddress.recomputations()).toBe(
        recomputations + 1,
      );
    });
  });

  describe('selectValidDestInternalAccountIds', () => {
    beforeEach(() => {
      selectValidDestInternalAccountIds.clearCache();
      selectValidDestInternalAccountIds.memoizedResultFunc.clearCache();
      selectValidDestInternalAccountIds.resetRecomputations();
    });

    it('returns an empty Set when the destination token is missing', () => {
      expect(selectValidDestInternalAccountIds(createSelectorState())).toEqual(
        new Set(),
      );
    });

    it.each([
      ['EVM', mockDestToken, [evmAccountId]],
      ['non-EVM', mockSolanaToken, [solanaAccountId]],
    ])(
      'returns valid internal account IDs for the %s destination',
      (_label, destToken, expectedAccountIds) => {
        const state = createSelectorState({ destToken });

        expect(selectValidDestInternalAccountIds(state)).toEqual(
          new Set(expectedAccountIds),
        );
      },
    );

    it('keeps the Set reference stable for unrelated state changes and recomputes for a destination token change', () => {
      const state = createSelectorState({
        destToken: mockDestToken,
        sourceAmount: '1',
      });
      const firstResult = selectValidDestInternalAccountIds(state);
      const recomputations = selectValidDestInternalAccountIds.recomputations();
      const unrelatedState = {
        ...state,
        bridge: {
          ...state.bridge,
          sourceAmount: '2',
        },
      };

      const secondResult = selectValidDestInternalAccountIds(unrelatedState);

      expect(secondResult).toBe(firstResult);
      expect(selectValidDestInternalAccountIds.recomputations()).toBe(
        recomputations,
      );

      const changedTokenState = {
        ...unrelatedState,
        bridge: {
          ...unrelatedState.bridge,
          destToken: mockSolanaToken,
        },
      };

      expect(selectValidDestInternalAccountIds(changedTokenState)).toEqual(
        new Set([solanaAccountId]),
      );
      expect(selectValidDestInternalAccountIds.recomputations()).toBe(
        recomputations + 1,
      );
    });
  });

  describe('selectIsGasIncluded7702BridgeEnabled', () => {
    beforeEach(() => {
      jest
        .mocked(getGaslessBridgeWith7702EnabledForChain)
        .mockReturnValue(false);
    });

    it('returns false when sourceToken is undefined', () => {
      const mockState = {
        bridge: { ...bridgeInitialState, sourceToken: undefined },
      } as RootState;

      expect(selectIsGasIncluded7702BridgeEnabled(mockState)).toBe(false);
    });

    it('returns false when sourceToken has no chainId', () => {
      const mockState = {
        bridge: {
          ...bridgeInitialState,
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
        bridge: { ...bridgeInitialState, sourceToken: mockToken },
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
          ...bridgeInitialState,
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
          ...bridgeInitialState,
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
          ...bridgeInitialState,
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
          ...bridgeInitialState,
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
          ...bridgeInitialState,
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
          ...bridgeInitialState,
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
          ...bridgeInitialState,
          sourceToken: mockToken,
          destToken: mockDestToken,
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: true,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: false, gasIncluded7702: false });
    });

    it('returns gasIncluded true with 7702 false for Solana source token regardless of STX and 7702 flags', () => {
      const solanaToken = {
        ...mockToken,
        chainId:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as `${string}:${string}`,
      };
      const mockState = {
        bridge: {
          ...bridgeInitialState,
          sourceToken: solanaToken,
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: false,
        },
      } as unknown as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: true, gasIncluded7702: false });
    });

    it('returns gasIncluded true with 7702 false for Solana when STX send bundle is supported', () => {
      const solanaToken = {
        ...mockToken,
        chainId:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as `${string}:${string}`,
      };
      const mockState = {
        bridge: {
          ...bridgeInitialState,
          sourceToken: solanaToken,
          isGasIncludedSTXSendBundleSupported: true,
          isGasIncluded7702Supported: true,
        },
      } as unknown as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: true, gasIncluded7702: false });
    });

    it('STX send bundle takes priority over bridge flag', () => {
      jest
        .mocked(getGaslessBridgeWith7702EnabledForChain)
        .mockReturnValue(true);

      const mockState = {
        bridge: {
          ...bridgeInitialState,
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

  describe('selectIsDestAssetRequireActivate', () => {
    const STELLAR_USDC =
      'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
    const DEST_ACCOUNT = {
      id: 'stellar-dest-id',
      address: 'GADESTACCOUNT0000000000000000000000000000000000000000000',
    };
    const ACTIVE_ACCOUNT = {
      id: 'stellar-active-id',
      address: 'GAACTIVEACCOUNT00000000000000000000000000000000000000000',
    };
    const mockSelectedByScope = jest.fn();

    const createDestActivateState = (
      bridgeOverrides: Partial<RootState['bridge']> = {},
    ) =>
      createSelectorState({
        sourceToken: createMockToken({
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          chainId: '0x1',
        }),
        destToken: createMockToken({
          address: STELLAR_USDC,
          symbol: 'USDC',
          chainId: XlmScope.Pubnet,
        }),
        destAddress: DEST_ACCOUNT.address,
        ...bridgeOverrides,
      });

    beforeEach(() => {
      jest.mocked(isCrossChain).mockReturnValue(true);
      jest.mocked(getIsAssetRequireActivate).mockReturnValue(true);
      jest
        .mocked(getMemoizedInternalAccountByAddress)
        .mockReturnValue(DEST_ACCOUNT as never);
      mockSelectedByScope.mockReturnValue(DEST_ACCOUNT);
      jest
        .mocked(selectSelectedInternalAccountByScope)
        .mockReturnValue(mockSelectedByScope);
      selectIsDestAssetRequireActivate.clearCache();
      selectIsDestSameAsActiveAccount.clearCache();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('returns true when cross-chain dest requires activation on the dest account', () => {
      const state = createDestActivateState();

      expect(selectIsDestAssetRequireActivate(state)).toBe(true);
      expect(selectIsDestSameAsActiveAccount(state)).toBe(true);
      expect(getIsAssetRequireActivate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          assetId: STELLAR_USDC,
          accountId: DEST_ACCOUNT.id,
        }),
      );
    });

    it('returns isDestSameAsActiveAccount false when dest differs from active dest-chain account', () => {
      mockSelectedByScope.mockReturnValue(ACTIVE_ACCOUNT);
      const state = createDestActivateState();

      expect(selectIsDestAssetRequireActivate(state)).toBe(true);
      expect(selectIsDestSameAsActiveAccount(state)).toBe(false);
    });

    it('returns false when destAddress has no matching internal account', () => {
      jest
        .mocked(getMemoizedInternalAccountByAddress)
        .mockReturnValue(undefined);
      const state = createDestActivateState({ destAddress: 'GEXTERNAL' });

      expect(selectIsDestAssetRequireActivate(state)).toBe(false);
      expect(getIsAssetRequireActivate).not.toHaveBeenCalled();
    });

    it('returns false for same-chain swaps', () => {
      jest.mocked(isCrossChain).mockReturnValue(false);
      const state = createDestActivateState();

      expect(selectIsDestAssetRequireActivate(state)).toBe(false);
    });

    it('returns false when destAddress is missing', () => {
      const state = createDestActivateState({ destAddress: undefined });

      expect(selectIsDestAssetRequireActivate(state)).toBe(false);
    });
  });
});
