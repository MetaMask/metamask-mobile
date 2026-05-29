import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import type { CaipAssetType } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import useAssetVisibility from './useAssetVisibility';
import type { TokenI } from '../../Tokens/types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    AssetsController: {
      addCustomAsset: jest.fn(),
      hideAsset: jest.fn(),
      unhideAsset: jest.fn(),
      removeCustomAsset: jest.fn(),
    },
    MultichainAssetsController: {
      addAssets: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

// Selectors are called via useSelector; we resolve them by identity in the mock.
jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountId: jest.fn(),
}));
jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));
jest.mock('../../../../selectors/assets/assets-controller', () => ({
  getCustomAssets: jest.fn(),
  getAssetsBalance: jest.fn(),
  getAssetPreferences: jest.fn(),
}));
jest.mock('../../../../selectors/multichain/multichain', () => ({
  selectMultichainAssetsAllIgnoredAssets: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCOUNT_ID = 'account-evm-1';
// Solana uses a different account entry in AssetsController
const SOL_ACCOUNT_ID = 'account-sol-1';
const EVM_CHAIN_HEX = '0x1';
const EVM_CHAIN_CAIP = 'eip155:1';
const EVM_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
// CAIP-19 produced by toAssetId for the EVM token
const EVM_ASSET_ID = `${EVM_CHAIN_CAIP}/erc20:${EVM_ADDRESS}` as CaipAssetType;

const SOL_CHAIN_CAIP = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SOL_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_ASSET_ID = `${SOL_CHAIN_CAIP}/token:${SOL_ADDRESS}` as CaipAssetType;

const evmToken = (chainId = EVM_CHAIN_HEX): TokenI =>
  ({
    address: EVM_ADDRESS,
    chainId,
    symbol: 'USDC',
    decimals: 6,
  }) as TokenI;

const solToken = (): TokenI =>
  ({
    address: SOL_ADDRESS,
    chainId: SOL_CHAIN_CAIP,
    symbol: 'USDC',
    decimals: 6,
  }) as TokenI;

// Default selector state — all "empty / no token present"
const defaultSelectorState = {
  // Global (EVM) account — fallback when no asset chainId
  globalAccountId: ACCOUNT_ID,
  // Solana account — returned when scope matches the Solana chain
  solanaAccountId: SOL_ACCOUNT_ID,
  customAssets: {},
  assetsBalance: {},
  assetPreferences: {},
  allIgnoredNonEvmAssets: {},
};

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

import { selectSelectedInternalAccountId } from '../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import {
  getCustomAssets,
  getAssetsBalance,
  getAssetPreferences,
} from '../../../../selectors/assets/assets-controller';
import { selectMultichainAssetsAllIgnoredAssets } from '../../../../selectors/multichain/multichain';

function setupSelectors(overrides: Partial<typeof defaultSelectorState> = {}) {
  const state = { ...defaultSelectorState, ...overrides };

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectSelectedInternalAccountId)
      return state.globalAccountId;
    // Returns a scope-factory function that resolves the correct account per chain.
    if (selector === selectSelectedInternalAccountByScope)
      return (scope: string) => {
        if (scope === SOL_CHAIN_CAIP) return { id: state.solanaAccountId };
        // EVM (both hex-converted and CAIP) fall through to the global EVM account.
        return { id: state.globalAccountId };
      };
    if (selector === getCustomAssets) return state.customAssets;
    if (selector === getAssetsBalance) return state.assetsBalance;
    if (selector === getAssetPreferences) return state.assetPreferences;
    if (selector === selectMultichainAssetsAllIgnoredAssets)
      return state.allIgnoredNonEvmAssets;
    return undefined;
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAssetVisibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectors();
  });

  // ── assetId ──────────────────────────────────────────────────────────────

  describe('assetId', () => {
    it('returns undefined when no asset is provided', () => {
      const { result } = renderHook(() => useAssetVisibility());
      expect(result.current.assetId).toBeUndefined();
    });

    it('resolves a CAIP-19 id from an EVM hex chainId', () => {
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      expect(result.current.assetId).toBe(EVM_ASSET_ID);
    });

    it('resolves a CAIP-19 id from an EVM CAIP chainId', () => {
      const { result } = renderHook(() =>
        useAssetVisibility(evmToken(EVM_CHAIN_CAIP)),
      );
      expect(result.current.assetId).toBe(EVM_ASSET_ID);
    });

    it('resolves a CAIP-19 id for a non-EVM (Solana) token', () => {
      const { result } = renderHook(() => useAssetVisibility(solToken()));
      expect(result.current.assetId).toBe(SOL_ASSET_ID);
    });

    it('returns undefined when address is missing', () => {
      const { result } = renderHook(() =>
        useAssetVisibility({ chainId: EVM_CHAIN_HEX } as TokenI),
      );
      expect(result.current.assetId).toBeUndefined();
    });

    it('returns undefined when chainId is missing', () => {
      const { result } = renderHook(() =>
        useAssetVisibility({ address: EVM_ADDRESS } as TokenI),
      );
      expect(result.current.assetId).toBeUndefined();
    });
  });

  // ── isCustomAsset ─────────────────────────────────────────────────────────

  describe('isCustomAsset', () => {
    it('returns false when no asset is provided', () => {
      const { result } = renderHook(() => useAssetVisibility());
      expect(result.current.isCustomAsset).toBe(false);
    });

    it('returns true when the assetId is in the account customAssets list', () => {
      setupSelectors({
        customAssets: { [ACCOUNT_ID]: [EVM_ASSET_ID] },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      expect(result.current.isCustomAsset).toBe(true);
    });

    it('returns false when the assetId is NOT in customAssets', () => {
      setupSelectors({
        customAssets: { [ACCOUNT_ID]: ['eip155:1/erc20:0xOther'] },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      expect(result.current.isCustomAsset).toBe(false);
    });

    it('returns false when accountId is undefined', () => {
      setupSelectors({
        globalAccountId: undefined as unknown as string,
        customAssets: { [ACCOUNT_ID]: [EVM_ASSET_ID] },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      expect(result.current.isCustomAsset).toBe(false);
    });
  });

  // ── isInAssetsBalance ─────────────────────────────────────────────────────

  describe('isInAssetsBalance', () => {
    it('returns false when no asset is provided', () => {
      const { result } = renderHook(() => useAssetVisibility());
      expect(result.current.isInAssetsBalance).toBe(false);
    });

    it('returns true when a balance entry exists for the account + assetId', () => {
      setupSelectors({
        assetsBalance: {
          [ACCOUNT_ID]: { [EVM_ASSET_ID]: { amount: '100', unit: 'USDC' } },
        },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      expect(result.current.isInAssetsBalance).toBe(true);
    });

    it('returns false when the asset has no balance entry', () => {
      setupSelectors({ assetsBalance: { [ACCOUNT_ID]: {} } });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      expect(result.current.isInAssetsBalance).toBe(false);
    });
  });

  // ── isHidden ──────────────────────────────────────────────────────────────

  describe('isHidden', () => {
    it('returns false when no asset is provided', () => {
      const { result } = renderHook(() => useAssetVisibility());
      expect(result.current.isHidden).toBe(false);
    });

    it('returns true when assetPreferences marks the EVM token as hidden', () => {
      setupSelectors({
        assetPreferences: { [EVM_ASSET_ID]: { hidden: true } },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      expect(result.current.isHidden).toBe(true);
    });

    it('returns false when assetPreferences.hidden is false', () => {
      setupSelectors({
        assetPreferences: { [EVM_ASSET_ID]: { hidden: false } },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      expect(result.current.isHidden).toBe(false);
    });

    it('returns true when the non-EVM token is in allIgnoredNonEvmAssets', () => {
      setupSelectors({
        // Keyed by the Solana account ID, not the global EVM account ID
        allIgnoredNonEvmAssets: { [SOL_ACCOUNT_ID]: [SOL_ASSET_ID] },
      });
      const { result } = renderHook(() => useAssetVisibility(solToken()));
      expect(result.current.isHidden).toBe(true);
    });

    it('returns false when non-EVM token is NOT in allIgnoredNonEvmAssets', () => {
      setupSelectors({
        allIgnoredNonEvmAssets: { [SOL_ACCOUNT_ID]: [] },
      });
      const { result } = renderHook(() => useAssetVisibility(solToken()));
      expect(result.current.isHidden).toBe(false);
    });

    it('prioritises isHidden over isInAssetsBalance (hidden token with balance stays hidden)', () => {
      setupSelectors({
        assetPreferences: { [EVM_ASSET_ID]: { hidden: true } },
        assetsBalance: {
          [ACCOUNT_ID]: { [EVM_ASSET_ID]: { amount: '100', unit: 'USDC' } },
        },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      expect(result.current.isHidden).toBe(true);
      expect(result.current.isInAssetsBalance).toBe(true);
    });
  });

  // ── handleHideToken ───────────────────────────────────────────────────────

  describe('handleHideToken', () => {
    it('does nothing when assetId is undefined', () => {
      const { result } = renderHook(() => useAssetVisibility());
      act(() => result.current.handleHideToken());
      expect(
        Engine.context.AssetsController.unhideAsset,
      ).not.toHaveBeenCalled();
      expect(Engine.context.AssetsController.hideAsset).not.toHaveBeenCalled();
      expect(
        Engine.context.AssetsController.removeCustomAsset,
      ).not.toHaveBeenCalled();
    });

    it('does nothing when accountId is undefined', () => {
      setupSelectors({ globalAccountId: undefined as unknown as string });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      act(() => result.current.handleHideToken());
      expect(Engine.context.AssetsController.hideAsset).not.toHaveBeenCalled();
    });

    it('calls unhideAsset when the EVM token is hidden via assetPreferences', () => {
      setupSelectors({
        assetPreferences: { [EVM_ASSET_ID]: { hidden: true } },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      act(() => result.current.handleHideToken());
      expect(Engine.context.AssetsController.unhideAsset).toHaveBeenCalledWith(
        EVM_ASSET_ID,
      );
      expect(Engine.context.AssetsController.hideAsset).not.toHaveBeenCalled();
    });

    it('calls unhideAsset AND MultichainAssetsController.addAssets when non-EVM token is in allIgnoredNonEvmAssets', () => {
      setupSelectors({
        // Solana ignored assets are keyed by the Solana account ID
        allIgnoredNonEvmAssets: { [SOL_ACCOUNT_ID]: [SOL_ASSET_ID] },
      });
      const { result } = renderHook(() => useAssetVisibility(solToken()));
      act(() => result.current.handleHideToken());
      expect(Engine.context.AssetsController.unhideAsset).toHaveBeenCalledWith(
        SOL_ASSET_ID,
      );
      // addAssets must be called with the Solana account ID, not the EVM one
      expect(
        Engine.context.MultichainAssetsController.addAssets,
      ).toHaveBeenCalledWith([SOL_ASSET_ID], SOL_ACCOUNT_ID);
    });

    it('calls unhideAsset but NOT addAssets when unhiding an EVM token (not in non-EVM ignored list)', () => {
      setupSelectors({
        assetPreferences: { [EVM_ASSET_ID]: { hidden: true } },
        allIgnoredNonEvmAssets: {},
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      act(() => result.current.handleHideToken());
      expect(Engine.context.AssetsController.unhideAsset).toHaveBeenCalledWith(
        EVM_ASSET_ID,
      );
      expect(
        Engine.context.MultichainAssetsController.addAssets,
      ).not.toHaveBeenCalled();
    });

    it('calls removeCustomAsset when the token is a custom asset (not hidden)', () => {
      setupSelectors({
        customAssets: { [ACCOUNT_ID]: [EVM_ASSET_ID] },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      act(() => result.current.handleHideToken());
      expect(
        Engine.context.AssetsController.removeCustomAsset,
      ).toHaveBeenCalledWith(ACCOUNT_ID, EVM_ASSET_ID);
      expect(Engine.context.AssetsController.hideAsset).not.toHaveBeenCalled();
    });

    it('calls hideAsset when token has a balance entry (not hidden, not custom)', () => {
      setupSelectors({
        assetsBalance: {
          [ACCOUNT_ID]: { [EVM_ASSET_ID]: { amount: '100', unit: 'USDC' } },
        },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      act(() => result.current.handleHideToken());
      expect(Engine.context.AssetsController.hideAsset).toHaveBeenCalledWith(
        EVM_ASSET_ID,
      );
      expect(
        Engine.context.AssetsController.unhideAsset,
      ).not.toHaveBeenCalled();
    });

    it('prefers unhideAsset over hideAsset when token is both hidden and has a balance', () => {
      setupSelectors({
        assetPreferences: { [EVM_ASSET_ID]: { hidden: true } },
        assetsBalance: {
          [ACCOUNT_ID]: { [EVM_ASSET_ID]: { amount: '100', unit: 'USDC' } },
        },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      act(() => result.current.handleHideToken());
      expect(Engine.context.AssetsController.unhideAsset).toHaveBeenCalledWith(
        EVM_ASSET_ID,
      );
      expect(Engine.context.AssetsController.hideAsset).not.toHaveBeenCalled();
    });

    it('prefers unhideAsset over removeCustomAsset when token is both hidden and custom', () => {
      setupSelectors({
        assetPreferences: { [EVM_ASSET_ID]: { hidden: true } },
        customAssets: { [ACCOUNT_ID]: [EVM_ASSET_ID] },
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      act(() => result.current.handleHideToken());
      expect(Engine.context.AssetsController.unhideAsset).toHaveBeenCalledWith(
        EVM_ASSET_ID,
      );
      expect(
        Engine.context.AssetsController.removeCustomAsset,
      ).not.toHaveBeenCalled();
    });

    it('does nothing when token is not hidden, not custom, and has no balance', () => {
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      act(() => result.current.handleHideToken());
      expect(
        Engine.context.AssetsController.unhideAsset,
      ).not.toHaveBeenCalled();
      expect(Engine.context.AssetsController.hideAsset).not.toHaveBeenCalled();
      expect(
        Engine.context.AssetsController.removeCustomAsset,
      ).not.toHaveBeenCalled();
    });

    it('logs an error and does not throw when AssetsController throws', () => {
      setupSelectors({
        assetsBalance: {
          [ACCOUNT_ID]: { [EVM_ASSET_ID]: { amount: '1', unit: 'USDC' } },
        },
      });
      const error = new Error('controller error');
      (
        Engine.context.AssetsController.hideAsset as jest.Mock
      ).mockImplementationOnce(() => {
        throw error;
      });
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      expect(() => act(() => result.current.handleHideToken())).not.toThrow();
      expect(Logger.log).toHaveBeenCalledWith(
        error,
        'useAssetVisibility: Failed to update token visibility',
      );
    });
  });

  // ── handleAddCustomAsset ──────────────────────────────────────────────────

  describe('handleAddCustomAsset', () => {
    it('calls AssetsController.addCustomAsset with accountId and the provided assetId', async () => {
      const { result } = renderHook(() => useAssetVisibility());
      await act(async () => {
        await result.current.handleAddCustomAsset(EVM_ASSET_ID);
      });
      expect(
        Engine.context.AssetsController.addCustomAsset,
      ).toHaveBeenCalledWith(ACCOUNT_ID, EVM_ASSET_ID);
    });

    it('does nothing when accountId is undefined', async () => {
      setupSelectors({ globalAccountId: undefined as unknown as string });
      const { result } = renderHook(() => useAssetVisibility());
      await act(async () => {
        await result.current.handleAddCustomAsset(EVM_ASSET_ID);
      });
      expect(
        Engine.context.AssetsController.addCustomAsset,
      ).not.toHaveBeenCalled();
    });

    it('can be called with a different assetId than the one the hook was initialised with', async () => {
      const { result } = renderHook(() => useAssetVisibility(evmToken()));
      await act(async () => {
        await result.current.handleAddCustomAsset(SOL_ASSET_ID);
      });
      expect(
        Engine.context.AssetsController.addCustomAsset,
      ).toHaveBeenCalledWith(ACCOUNT_ID, SOL_ASSET_ID);
    });

    it('uses accountIdOverride instead of the hook-resolved accountId when provided', async () => {
      // Simulate the cross-chain mismatch: hook called without asset so its
      // internal accountId falls back to the global EVM account (ACCOUNT_ID),
      // but the caller explicitly provides the Solana account ID.
      const { result } = renderHook(() => useAssetVisibility());
      await act(async () => {
        await result.current.handleAddCustomAsset(SOL_ASSET_ID, SOL_ACCOUNT_ID);
      });
      expect(
        Engine.context.AssetsController.addCustomAsset,
      ).toHaveBeenCalledWith(SOL_ACCOUNT_ID, SOL_ASSET_ID);
    });

    it('does nothing when both accountId and accountIdOverride are undefined', async () => {
      setupSelectors({ globalAccountId: undefined as unknown as string });
      const { result } = renderHook(() => useAssetVisibility());
      await act(async () => {
        await result.current.handleAddCustomAsset(EVM_ASSET_ID, undefined);
      });
      expect(
        Engine.context.AssetsController.addCustomAsset,
      ).not.toHaveBeenCalled();
    });
  });
});
