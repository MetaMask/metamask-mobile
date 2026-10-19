import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import type { AccountGroupId } from '@metamask/account-api';
import { EthAccountType } from '@metamask/keyring-api';

import { useAccountTokens } from './useAccountTokens';
import { getNetworkBadgeSource } from '../../utils/network';
import { formatFiat } from '../../utils/fiat';
import { TokenStandard } from '../../types/token';
import { useTransactionPayCurrency } from '../pay/useTransactionPayCurrency';
import { useTokensData } from '../../../../hooks/useTokensData/useTokensData';
import { buildEvmCaip19AssetId } from '../../../../../util/multichain/buildEvmCaip19AssetId';
import { getSelectedCurrency } from '../../../../../selectors/assets/assets-controller';
import { useEnsureAccountGroupAssets } from './useEnsureAccountGroupAssets';
import { useAccountOverrideGroupId } from './useAccountOverrideGroupId';
import {
  selectConfirmationAssetsByAccountGroupId,
  selectConfirmationAssetsWithBalanceByAccountGroupId,
  type ConfirmationAsset,
} from '../../selectors/assets';
import type { RootState } from '../../../../../reducers';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../utils/network', () => ({
  getNetworkBadgeSource: jest.fn(),
}));

jest.mock('../../utils/fiat', () => ({
  formatFiat: jest.fn(),
}));

jest.mock('../pay/useTransactionPayCurrency', () => ({
  useTransactionPayCurrency: jest.fn(),
}));

// Partial mock: the real module also provides the slice selectors that the
// (partially real) assets selector module builds on at import time.
jest.mock('../../../../../selectors/assets/assets-controller', () => ({
  ...jest.requireActual('../../../../../selectors/assets/assets-controller'),
  getSelectedCurrency: jest.fn(),
}));

jest.mock('../../../../hooks/useTokensData/useTokensData');
jest.mock('../../../../../util/multichain/buildEvmCaip19AssetId');

// Asset fetching for a non-selected account group is covered by
// useEnsureAccountGroupAssets's own tests; stubbed here to keep this suite
// focused on token derivation.
jest.mock('./useEnsureAccountGroupAssets', () => ({
  useEnsureAccountGroupAssets: jest.fn(() => false),
}));

// useAccountOverrideGroupId has its own test suite and internally calls
// useSelector twice; mock it so the only useSelector consumers in this suite
// are the ones inside useAccountTokens itself.
jest.mock('./useAccountOverrideGroupId', () => ({
  useAccountOverrideGroupId: jest.fn(),
}));

// Partial mock so both selectors stay assertable while the real module provides
// all other exports (ConfirmationAsset type, etc.).
jest.mock('../../selectors/assets', () => ({
  ...jest.requireActual('../../selectors/assets'),
  selectConfirmationAssetsByAccountGroupId: jest.fn(),
  selectConfirmationAssetsWithBalanceByAccountGroupId: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseEnsureAccountGroupAssets = jest.mocked(
  useEnsureAccountGroupAssets,
);
const mockGetNetworkBadgeSource = jest.mocked(getNetworkBadgeSource);
const mockFormatFiat = jest.mocked(formatFiat);
const mockUseTokensData = jest.mocked(useTokensData);
const mockBuildEvmCaip19AssetId = jest.mocked(buildEvmCaip19AssetId);
const mockUseTransactionPayCurrency = jest.mocked(useTransactionPayCurrency);
const mockUseAccountOverrideGroupId = jest.mocked(useAccountOverrideGroupId);
const mockGetSelectedCurrency = jest.mocked(getSelectedCurrency);
const mockSelectConfirmationAssetsByAccountGroup = jest.mocked(
  selectConfirmationAssetsByAccountGroupId,
);
const mockSelectConfirmationAssetsWithBalanceByAccountGroup = jest.mocked(
  selectConfirmationAssetsWithBalanceByAccountGroupId,
);

// Selectors are mocked, so the state only needs a stable identity
// for the call assertions.
const MOCK_STATE = {} as RootState;

/**
 * Builds a decorated asset as selectConfirmationAssetsByAccountGroupId would
 * return it, i.e. already carrying its formatted fiat string.
 */
function buildAsset(
  overrides: Partial<ConfirmationAsset> = {},
): ConfirmationAsset {
  return {
    accountId: 'account-1',
    accountType: EthAccountType.Eoa,
    address: '0xtoken1',
    assetId: '0xtoken1',
    balance: '10',
    balanceInSelectedCurrency: '$100.00',
    chainId: '0x1',
    decimals: 18,
    fiat: { balance: 100, conversionRate: 10, currency: 'USD' },
    image: '',
    isETH: false,
    isNative: false,
    key: '0x1:0xtoken1',
    logo: undefined,
    name: 'Token One',
    networkBadgeSource: 'network-badge-source',
    rawBalance: '0x8ac7230489e80000',
    sortKey: 100,
    standard: TokenStandard.ERC20,
    symbol: 'TOKEN1',
    ...overrides,
  } as ConfirmationAsset;
}

/**
 * Stubs both asset selectors, so a test does not have to know which of them
 * the `includeNoBalance` flag routes to.
 */
function setAssets(assets: ConfirmationAsset[]) {
  mockSelectConfirmationAssetsByAccountGroup.mockReturnValue(assets);
  mockSelectConfirmationAssetsWithBalanceByAccountGroup.mockReturnValue(assets);
}

const assetWithBalance = buildAsset();

const assetZeroBalance = buildAsset({
  address: '0xtoken2',
  assetId: '0xtoken2',
  balance: '0',
  balanceInSelectedCurrency: undefined,
  fiat: undefined,
  key: '0x1:0xtoken2',
  rawBalance: '0x0',
  sortKey: 0,
  symbol: 'TOKEN2',
});

const assetRawBalanceOnly = buildAsset({
  address: '0xtoken3',
  assetId: '0xtoken3',
  balance: '5',
  balanceInSelectedCurrency: undefined,
  fiat: undefined,
  key: '0x1:0xtoken3',
  rawBalance: '0x4563918244f40000',
  sortKey: 0,
  symbol: 'TOKEN3',
});

describe('useAccountTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTransactionPayCurrency.mockReturnValue(undefined);
    mockUseAccountOverrideGroupId.mockReturnValue(undefined);
    mockGetSelectedCurrency.mockReturnValue('chf');
    setAssets([assetWithBalance]);
    mockUseSelector.mockImplementation((selector) => selector(MOCK_STATE));
    mockFormatFiat.mockReturnValue('$0.00');
    mockGetNetworkBadgeSource.mockReturnValue('network-badge-source');
    mockUseTokensData.mockReturnValue({});
    mockBuildEvmCaip19AssetId.mockImplementation(
      (address: string, chainId: Hex) =>
        `eip155:${chainId}/erc20:${address.toLowerCase()}`,
    );
  });

  describe('tokenFilter', () => {
    it('excludes assets that fail the tokenFilter', () => {
      const filterRejectAll = jest.fn(() => false);

      const { result } = renderHook(() =>
        useAccountTokens({ tokenFilter: filterRejectAll }),
      );

      expect(result.current).toHaveLength(0);
    });

    it('includes assets that pass the tokenFilter', () => {
      const filterAcceptAll = jest.fn(() => true);

      const { result } = renderHook(() =>
        useAccountTokens({ tokenFilter: filterAcceptAll }),
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('TOKEN1');
    });

    it('excludes assets missing chainId when tokenFilter is provided', () => {
      const assetNoChainId = buildAsset({
        chainId: '',
        key: ':0xtoken1',
        symbol: 'NO_CHAIN',
      });
      setAssets([assetWithBalance, assetNoChainId]);
      const filter = jest.fn(() => true);

      const { result } = renderHook(() =>
        useAccountTokens({ tokenFilter: filter }),
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('TOKEN1');
    });

    it('excludes assets missing assetId when tokenFilter is provided', () => {
      const assetNoAssetId = buildAsset({
        assetId: '',
        key: '0x1:',
        symbol: 'NO_ASSET_ID',
      });
      setAssets([assetWithBalance, assetNoAssetId]);
      const filter = jest.fn(() => true);

      const { result } = renderHook(() =>
        useAccountTokens({ tokenFilter: filter }),
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('TOKEN1');
    });

    it('passes chainId and assetId to the tokenFilter', () => {
      const filter = jest.fn(() => true);

      renderHook(() => useAccountTokens({ tokenFilter: filter }));

      expect(filter).toHaveBeenCalledWith('0x1', '0xtoken1');
    });
  });

  describe('includeNoBalance filtering', () => {
    it('uses selectConfirmationAssetsWithBalanceByAccountGroupId by default', () => {
      renderHook(() => useAccountTokens());

      expect(
        mockSelectConfirmationAssetsWithBalanceByAccountGroup,
      ).toHaveBeenCalled();
      expect(mockSelectConfirmationAssetsByAccountGroup).not.toHaveBeenCalled();
    });

    it('uses selectConfirmationAssetsByAccountGroupId when includeNoBalance is true', () => {
      renderHook(() => useAccountTokens({ includeNoBalance: true }));

      expect(mockSelectConfirmationAssetsByAccountGroup).toHaveBeenCalled();
      expect(
        mockSelectConfirmationAssetsWithBalanceByAccountGroup,
      ).not.toHaveBeenCalled();
    });

    it('includes zero-balance assets when includeNoBalance is true', () => {
      setAssets([assetWithBalance, assetZeroBalance]);

      const { result } = renderHook(() =>
        useAccountTokens({ includeNoBalance: true }),
      );

      const symbols = result.current.map((a) => a.symbol);
      expect(symbols).toContain('TOKEN1');
      expect(symbols).toContain('TOKEN2');
    });

    it('includes assets with no fiat balance but non-zero rawBalance when includeNoBalance is false', () => {
      setAssets([assetRawBalanceOnly]);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('TOKEN3');
    });
  });

  describe('currency override', () => {
    it('passes no override to the selector outside the pay flow', () => {
      mockUseTransactionPayCurrency.mockReturnValue(undefined);

      renderHook(() => useAccountTokens());

      expect(
        mockSelectConfirmationAssetsWithBalanceByAccountGroup,
      ).toHaveBeenCalledWith(MOCK_STATE, undefined, undefined);
    });

    it('passes the pay currency to the selector inside the pay flow', () => {
      mockUseTransactionPayCurrency.mockReturnValue('USD');

      renderHook(() => useAccountTokens({ includeNoBalance: true }));

      expect(mockSelectConfirmationAssetsByAccountGroup).toHaveBeenCalledWith(
        MOCK_STATE,
        undefined,
        'USD',
      );
    });

    it('returns the formatted balance exactly as the selector produced it', () => {
      // Formatting moved into the selector, so the hook must not re-derive it.
      setAssets([buildAsset({ balanceInSelectedCurrency: 'CHF 81.50' })]);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current[0].balanceInSelectedCurrency).toBe('CHF 81.50');
    });
  });

  describe('enrichTokenRequests', () => {
    it('adds zero-balance placeholders for tokens not already in the asset list', () => {
      setAssets([]);
      mockUseTokensData.mockReturnValue({
        'eip155:0x1/erc20:0xusdc': {
          assetId: 'eip155:0x1/erc20:0xusdc',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          iconUrl: 'https://example.com/usdc.png',
        },
      });
      const requests = [{ chainId: '0x1' as Hex, address: '0xusdc' }];

      const { result } = renderHook(() =>
        useAccountTokens({ enrichTokenRequests: requests }),
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('USDC');
      expect(result.current[0].balance).toBe('0');
      expect(result.current[0].decimals).toBe(6);
    });

    it('deduplicates against existing asset keys', () => {
      const existingUsdc = buildAsset({
        address: '0xusdc',
        assetId: '0xusdc',
        key: '0x1:0xusdc',
        symbol: 'USDC',
      });
      setAssets([existingUsdc]);
      mockUseTokensData.mockReturnValue({
        'eip155:0x1/erc20:0xusdc': {
          assetId: 'eip155:0x1/erc20:0xusdc',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          iconUrl: 'https://example.com/usdc.png',
        },
      });
      const requests = [{ chainId: '0x1' as Hex, address: '0xusdc' }];

      const { result } = renderHook(() =>
        useAccountTokens({ enrichTokenRequests: requests }),
      );

      const usdcEntries = result.current.filter((a) => a.symbol === 'USDC');
      expect(usdcEntries).toHaveLength(1);
      expect(usdcEntries[0].balance).not.toBe('0');
    });

    it('skips entries with neither name nor symbol', () => {
      setAssets([]);
      mockUseTokensData.mockReturnValue({});
      const requests = [{ chainId: '0x1' as Hex, address: '0xunknown' }];

      const { result } = renderHook(() =>
        useAccountTokens({ enrichTokenRequests: requests }),
      );

      expect(result.current).toHaveLength(0);
    });

    it('adds no placeholders when enrichTokenRequests is empty', () => {
      setAssets([]);

      const { result } = renderHook(() =>
        useAccountTokens({ enrichTokenRequests: [] }),
      );

      expect(result.current).toHaveLength(0);
    });

    it('does not format when enrichTokenRequests is empty', () => {
      setAssets([]);

      renderHook(() => useAccountTokens({ enrichTokenRequests: [] }));

      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('formats the placeholder zero in the preferred currency', () => {
      setAssets([]);
      mockUseTokensData.mockReturnValue({
        'eip155:0x1/erc20:0xusdc': {
          assetId: 'eip155:0x1/erc20:0xusdc',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          iconUrl: '',
        },
      });
      const requests = [{ chainId: '0x1' as Hex, address: '0xusdc' }];

      renderHook(() => useAccountTokens({ enrichTokenRequests: requests }));

      expect(mockFormatFiat).toHaveBeenCalledWith(0, 'chf');
    });

    it('formats the placeholder zero in the override currency inside the pay flow', () => {
      mockUseTransactionPayCurrency.mockReturnValue('USD');
      setAssets([]);
      mockUseTokensData.mockReturnValue({
        'eip155:0x1/erc20:0xusdc': {
          assetId: 'eip155:0x1/erc20:0xusdc',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          iconUrl: '',
        },
      });
      const requests = [{ chainId: '0x1' as Hex, address: '0xusdc' }];

      renderHook(() => useAccountTokens({ enrichTokenRequests: requests }));

      expect(mockFormatFiat).toHaveBeenCalledWith(0, 'USD');
    });
  });

  describe('sort order', () => {
    it('sorts merged owned + placeholder list by sortKey descending', () => {
      const highAsset = buildAsset({ sortKey: 200, symbol: 'HIGH' });
      const lowAsset = buildAsset({
        address: '0xlow',
        assetId: '0xlow',
        key: '0x1:0xlow',
        sortKey: 10,
        symbol: 'LOW',
      });
      // Placeholder has sortKey 0
      setAssets([lowAsset, highAsset]);
      mockUseTokensData.mockReturnValue({
        'eip155:0x1/erc20:0xplaceholder': {
          assetId: 'eip155:0x1/erc20:0xplaceholder',
          name: 'Placeholder',
          symbol: 'PLACEHOLDER',
          decimals: 18,
          iconUrl: '',
        },
      });
      const requests = [{ chainId: '0x1' as Hex, address: '0xplaceholder' }];

      const { result } = renderHook(() =>
        useAccountTokens({ enrichTokenRequests: requests }),
      );

      expect(result.current[0].symbol).toBe('HIGH');
      expect(result.current[1].symbol).toBe('LOW');
      expect(result.current[2].symbol).toBe('PLACEHOLDER');
    });
  });

  describe('account override wiring', () => {
    const RESOLVED = 'entropy:group-1/0' as AccountGroupId;

    it('calls useEnsureAccountGroupAssets with the override group id', () => {
      mockUseAccountOverrideGroupId.mockReturnValue(RESOLVED);

      renderHook(() => useAccountTokens());

      expect(mockUseEnsureAccountGroupAssets).toHaveBeenCalledWith(
        'entropy:group-1/0',
      );
    });

    it('passes undefined group id to useEnsureAccountGroupAssets when no override is active', () => {
      mockUseAccountOverrideGroupId.mockReturnValue(undefined);

      renderHook(() => useAccountTokens());

      expect(mockUseEnsureAccountGroupAssets).toHaveBeenCalledWith(undefined);
    });

    it('queries the selector with the override group id when an override is active', () => {
      mockUseAccountOverrideGroupId.mockReturnValue(RESOLVED);

      renderHook(() => useAccountTokens());

      expect(
        mockSelectConfirmationAssetsWithBalanceByAccountGroup,
      ).toHaveBeenCalledWith(MOCK_STATE, 'entropy:group-1/0', undefined);
    });

    it('queries the selector with an undefined group id when no override is active', () => {
      mockUseAccountOverrideGroupId.mockReturnValue(undefined);

      renderHook(() => useAccountTokens());

      expect(
        mockSelectConfirmationAssetsWithBalanceByAccountGroup,
      ).toHaveBeenCalledWith(MOCK_STATE, undefined, undefined);
    });

    it('returns the assets of the override group', () => {
      mockUseAccountOverrideGroupId.mockReturnValue(RESOLVED);
      setAssets([buildAsset({ symbol: 'OVERRIDE' })]);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('OVERRIDE');
    });

    it('keeps the assets of the selected group when no override is active', () => {
      mockUseAccountOverrideGroupId.mockReturnValue(undefined);
      setAssets([buildAsset({ symbol: 'GLOBAL' })]);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('GLOBAL');
    });
  });
});
