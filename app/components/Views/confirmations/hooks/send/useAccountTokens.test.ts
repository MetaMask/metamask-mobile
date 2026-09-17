import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { EthAccountType } from '@metamask/keyring-api';

import { useAccountTokens } from './useAccountTokens';
import { getNetworkBadgeSource } from '../../utils/network';
import { TokenStandard } from '../../types/token';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useAssetFiatFormatter } from '../pay/useAssetFiatFormatter';
import { useTokensData } from '../../../../hooks/useTokensData/useTokensData';
import { buildEvmCaip19AssetId } from '../../../../../util/multichain/buildEvmCaip19AssetId';
import { useEnsureAccountGroupAssets } from './useEnsureAccountGroupAssets';
import { useAccountOverrideGroupId } from './useAccountOverrideGroupId';
import {
  selectAccountGroupAssets,
  type SelectedAsset,
} from '../../selectors/assets';
import type { RootState } from '../../../../../reducers';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../utils/network', () => ({
  getNetworkBadgeSource: jest.fn(),
}));

jest.mock('../transactions/useTransactionAccountOverride', () => ({
  useTransactionAccountOverride: jest.fn(),
}));

jest.mock('../pay/useAssetFiatFormatter', () => ({
  useAssetFiatFormatter: jest.fn(),
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
// useSelector twice; mock it so the only useSelector consumer in this suite is
// the selectAccountGroupAssets call inside useDecoratedAssets.
jest.mock('./useAccountOverrideGroupId', () => ({
  useAccountOverrideGroupId: jest.fn(),
}));

// Partial mock so the real hasBalance still runs, while the group id handed to
// selectAccountGroupAssets stays assertable.
jest.mock('../../selectors/assets', () => ({
  ...jest.requireActual('../../selectors/assets'),
  selectAccountGroupAssets: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseEnsureAccountGroupAssets = jest.mocked(
  useEnsureAccountGroupAssets,
);
const mockGetNetworkBadgeSource = jest.mocked(getNetworkBadgeSource);
const mockUseTokensData = jest.mocked(useTokensData);
const mockBuildEvmCaip19AssetId = jest.mocked(buildEvmCaip19AssetId);
const mockUseTransactionAccountOverride = jest.mocked(
  useTransactionAccountOverride,
);
const mockUseAccountOverrideGroupId = jest.mocked(useAccountOverrideGroupId);
const mockUseAssetFiatFormatter = jest.mocked(useAssetFiatFormatter);
const mockSelectAccountGroupAssets = jest.mocked(selectAccountGroupAssets);

const mockFormatFiat = jest.fn();

// selectAccountGroupAssets is mocked, so the state only needs a stable identity
// for the call assertions.
const MOCK_STATE = {} as RootState;

/**
 * Builds a decorated asset as selectAccountGroupAssets would return it.
 * All fields are explicitly provided so hasBalance and the hook's formatting
 * logic can be exercised against realistic values.
 */
function buildAsset(overrides: Partial<SelectedAsset> = {}): SelectedAsset {
  return {
    accountId: 'account-1',
    accountType: EthAccountType.Eoa,
    address: '0xtoken1',
    assetId: '0xtoken1',
    balance: '10',
    chainId: '0x1',
    decimals: 18,
    fiat: { balance: 100, conversionRate: 10, currency: 'USD' },
    image: '',
    isETH: false,
    isEvmRateEligible: true,
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
  } as SelectedAsset;
}

const assetWithBalance = buildAsset();

const assetZeroBalance = buildAsset({
  address: '0xtoken2',
  assetId: '0xtoken2',
  balance: '0',
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
  fiat: undefined,
  key: '0x1:0xtoken3',
  rawBalance: '0x4563918244f40000',
  sortKey: 0,
  symbol: 'TOKEN3',
});

describe('useAccountTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTransactionAccountOverride.mockReturnValue(undefined);
    mockUseAccountOverrideGroupId.mockReturnValue(undefined);
    mockSelectAccountGroupAssets.mockReturnValue([assetWithBalance]);
    mockUseSelector.mockImplementation((selector) => selector(MOCK_STATE));
    mockFormatFiat.mockReturnValue('$100.00');
    mockUseAssetFiatFormatter.mockReturnValue({
      format: mockFormatFiat,
      fiatCurrency: 'USD',
    });
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
      mockUseSelector.mockReturnValue([assetWithBalance]);

      const { result } = renderHook(() =>
        useAccountTokens({ tokenFilter: filterRejectAll }),
      );

      expect(result.current).toHaveLength(0);
    });

    it('includes assets that pass the tokenFilter', () => {
      const filterAcceptAll = jest.fn(() => true);
      mockUseSelector.mockReturnValue([assetWithBalance]);

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
      mockUseSelector.mockReturnValue([assetWithBalance, assetNoChainId]);
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
      mockUseSelector.mockReturnValue([assetWithBalance, assetNoAssetId]);
      const filter = jest.fn(() => true);

      const { result } = renderHook(() =>
        useAccountTokens({ tokenFilter: filter }),
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('TOKEN1');
    });

    it('passes chainId and assetId to the tokenFilter', () => {
      mockUseSelector.mockReturnValue([assetWithBalance]);
      const filter = jest.fn(() => true);

      renderHook(() => useAccountTokens({ tokenFilter: filter }));

      expect(filter).toHaveBeenCalledWith('0x1', '0xtoken1');
    });
  });

  describe('includeNoBalance filtering', () => {
    it('excludes assets with no fiat balance and zero rawBalance by default', () => {
      mockUseSelector.mockReturnValue([assetWithBalance, assetZeroBalance]);

      const { result } = renderHook(() => useAccountTokens());

      const symbols = result.current.map((a) => a.symbol);
      expect(symbols).not.toContain('TOKEN2');
    });

    it('includes assets with no fiat balance but non-zero rawBalance', () => {
      mockUseSelector.mockReturnValue([assetRawBalanceOnly]);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('TOKEN3');
    });

    it('includes zero-balance assets when includeNoBalance is true', () => {
      mockUseSelector.mockReturnValue([assetWithBalance, assetZeroBalance]);

      const { result } = renderHook(() =>
        useAccountTokens({ includeNoBalance: true }),
      );

      const symbols = result.current.map((a) => a.symbol);
      expect(symbols).toContain('TOKEN1');
      expect(symbols).toContain('TOKEN2');
    });

    it('returns empty list when all assets have zero balance and includeNoBalance is false', () => {
      mockUseSelector.mockReturnValue([assetZeroBalance]);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(0);
    });
  });

  describe('balanceInSelectedCurrency', () => {
    it('formats fiat balance through the formatter', () => {
      mockFormatFiat.mockReturnValue('$100.00');
      mockUseSelector.mockReturnValue([assetWithBalance]);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current[0].balanceInSelectedCurrency).toBe('$100.00');
      expect(mockFormatFiat).toHaveBeenCalledWith(
        expect.objectContaining({ toFixed: expect.any(Function) }),
      );
    });

    it('passes fiat.balance as a BigNumber to the formatter', () => {
      const asset = buildAsset({
        fiat: { balance: 42.5, conversionRate: 1, currency: 'USD' },
      });
      mockUseSelector.mockReturnValue([asset]);
      mockFormatFiat.mockImplementation((v) => `formatted:${String(v)}`);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current[0].balanceInSelectedCurrency).toBe(
        'formatted:42.5',
      );
    });

    it('sets balanceInSelectedCurrency to undefined when fiat.balance is undefined', () => {
      const assetNoFiat = buildAsset({
        fiat: undefined,
        rawBalance: '0x1234',
        sortKey: 0,
        symbol: 'NO_FIAT',
      });
      mockUseSelector.mockReturnValue([assetNoFiat]);

      const { result } = renderHook(() =>
        useAccountTokens({ includeNoBalance: true }),
      );

      expect(result.current[0].balanceInSelectedCurrency).toBeUndefined();
    });

    it('propagates undefined from the formatter as undefined balanceInSelectedCurrency', () => {
      mockFormatFiat.mockReturnValue(undefined);
      mockUseSelector.mockReturnValue([assetWithBalance]);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current[0].balanceInSelectedCurrency).toBeUndefined();
    });
  });

  describe('enrichTokenRequests', () => {
    it('adds zero-balance placeholders for tokens not already in the asset list', () => {
      mockUseSelector.mockReturnValue([]);
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
      mockUseSelector.mockReturnValue([existingUsdc]);
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
      mockUseSelector.mockReturnValue([]);
      mockUseTokensData.mockReturnValue({});
      const requests = [{ chainId: '0x1' as Hex, address: '0xunknown' }];

      const { result } = renderHook(() =>
        useAccountTokens({ enrichTokenRequests: requests }),
      );

      expect(result.current).toHaveLength(0);
    });

    it('adds no placeholders when enrichTokenRequests is empty', () => {
      mockUseSelector.mockReturnValue([]);

      const { result } = renderHook(() =>
        useAccountTokens({ enrichTokenRequests: [] }),
      );

      expect(result.current).toHaveLength(0);
    });

    it('does not call the formatter when enrichTokenRequests is empty', () => {
      mockUseSelector.mockReturnValue([]);

      renderHook(() => useAccountTokens({ enrichTokenRequests: [] }));

      // formatFiat is still called for the owned-asset fiat formatting path, but
      // never for the zeroFiat placeholder — verify it is not called at all
      // when both owned assets and requests lists are empty.
      expect(mockFormatFiat).not.toHaveBeenCalled();
    });

    it('calls the formatter once for zeroFiat when at least one request is present', () => {
      mockUseSelector.mockReturnValue([]);
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

      // The zeroFiat memo calls formatFiat(0)
      expect(mockFormatFiat).toHaveBeenCalledWith(0);
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
      mockUseSelector.mockReturnValue([lowAsset, highAsset]);
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
    it('calls useEnsureAccountGroupAssets with the override group id', () => {
      mockUseAccountOverrideGroupId.mockReturnValue('entropy:group-1/0');
      mockUseTransactionAccountOverride.mockReturnValue('0xOverride' as never);

      renderHook(() => useAccountTokens());

      expect(mockUseEnsureAccountGroupAssets).toHaveBeenCalledWith(
        'entropy:group-1/0',
      );
    });

    it('passes undefined group id to useEnsureAccountGroupAssets when no override is active', () => {
      mockUseAccountOverrideGroupId.mockReturnValue(undefined);
      mockUseTransactionAccountOverride.mockReturnValue(undefined);

      renderHook(() => useAccountTokens());

      expect(mockUseEnsureAccountGroupAssets).toHaveBeenCalledWith(undefined);
    });

    it('queries the selector with the override group id when an override is active', () => {
      mockUseTransactionAccountOverride.mockReturnValue('0xOverride' as never);
      mockUseAccountOverrideGroupId.mockReturnValue('entropy:group-1/0');

      renderHook(() => useAccountTokens());

      expect(mockSelectAccountGroupAssets).toHaveBeenCalledWith(
        MOCK_STATE,
        'entropy:group-1/0',
      );
    });

    it('queries the selector with an undefined group id when no override is active', () => {
      mockUseTransactionAccountOverride.mockReturnValue(undefined);
      mockUseAccountOverrideGroupId.mockReturnValue('entropy:group-1/0');

      renderHook(() => useAccountTokens());

      expect(mockSelectAccountGroupAssets).toHaveBeenCalledWith(
        MOCK_STATE,
        undefined,
      );
    });

    it('returns the assets of the override group', () => {
      mockUseTransactionAccountOverride.mockReturnValue('0xOverride' as never);
      mockUseAccountOverrideGroupId.mockReturnValue('entropy:group-1/0');
      mockSelectAccountGroupAssets.mockReturnValue([
        buildAsset({ symbol: 'OVERRIDE' }),
      ]);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('OVERRIDE');
    });
  });
});
