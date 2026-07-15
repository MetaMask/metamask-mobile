import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';

import { useAccountTokens } from './useAccountTokens';
import { getNetworkBadgeSource } from '../../utils/network';
import { TokenStandard } from '../../types/token';
import {
  selectAssetsBySelectedAccountGroup,
  selectAssetsByAccountGroupId,
} from '../../../../../selectors/assets/assets-list';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { isTestNet } from '../../../../../util/networks';
import { useTokensData } from '../../../../hooks/useTokensData/useTokensData';
import { buildEvmCaip19AssetId } from '../../../../../util/multichain/buildEvmCaip19AssetId';
import { Hex } from '@metamask/utils';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useAssetFiatFormatter } from '../pay/useAssetFiatFormatter';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../utils/network', () => ({
  getNetworkBadgeSource: jest.fn(),
}));

jest.mock('../../../../../util/networks', () => ({
  isTestNet: jest.fn(),
}));

jest.mock('../transactions/useTransactionAccountOverride', () => ({
  useTransactionAccountOverride: jest.fn(),
}));
const useTransactionAccountOverrideMock = jest.mocked(
  useTransactionAccountOverride,
);

jest.mock('../pay/useAssetFiatFormatter', () => ({
  useAssetFiatFormatter: jest.fn(),
}));
const useAssetFiatFormatterMock = jest.mocked(useAssetFiatFormatter);

jest.mock('../tokens/useTokenFiatRates', () => ({
  useTokenFiatRates: jest.fn(),
}));
const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);

jest.mock('../../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn((chainId: string) => !chainId?.startsWith('0x')),
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  selectInternalAccountsById: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountToGroupMap: jest.fn(),
  }),
);

jest.mock('../../../../../selectors/assets/assets-list', () => ({
  selectAssetsBySelectedAccountGroup: jest.fn(),
  selectAssetsByAccountGroupId: jest.fn(),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

jest.mock('../../../../../selectors/settings', () => ({
  selectShowFiatInTestnets: jest.fn(),
}));

jest.mock('../../../../hooks/useTokensData/useTokensData');
jest.mock('../../../../../util/multichain/buildEvmCaip19AssetId');

const mockUseSelector = jest.mocked(useSelector);
const mockGetNetworkBadgeSource = jest.mocked(getNetworkBadgeSource);
const mockSelectAssetsBySelectedAccountGroup = jest.mocked(
  selectAssetsBySelectedAccountGroup,
);
const mockSelectCurrentCurrency = jest.mocked(selectCurrentCurrency);
const mockIsTestNet = jest.mocked(isTestNet);
const mockUseTokensData = jest.mocked(useTokensData);
const mockBuildEvmCaip19AssetId = jest.mocked(buildEvmCaip19AssetId);

const mockFormatFiat = jest.fn();

const mockAssets = {
  '0x1': [
    {
      chainId: '0x1',
      address: '0xtoken1',
      accountType: 'eip155:1/erc20:0xtoken1',
      balance: '100.50',
      fiat: { balance: '100.50' },
      rawBalance: '0x1234',
      symbol: 'TOKEN1',
    },
    {
      chainId: '0x1',
      address: '0xtoken2',
      accountType: 'eip155:1/erc20:0xtoken2',
      balance: '0',
      fiat: { balance: '0' },
      rawBalance: '0x0',
      symbol: 'TOKEN2',
    },
  ],
  'solana:mainnet': [
    {
      chainId: 'solana:mainnet',
      address: 'SolTokenPubkey1',
      accountType: 'solana:mainnet/spl:0xsoltoken1',
      balance: '50.25',
      fiat: { balance: '50.25' },
      rawBalance: '0x5678',
      symbol: 'SOLTOKEN1',
    },
  ],
};

describe('useAccountTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionAccountOverrideMock.mockReturnValue(undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSelectAssetsBySelectedAccountGroup.mockReturnValue(mockAssets as any);
    mockSelectCurrentCurrency.mockReturnValue('USD');

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAssetsBySelectedAccountGroup) {
        return mockAssets;
      }
      if (selector === selectCurrentCurrency) {
        return 'USD';
      }
      if (selector === selectInternalAccountsById) {
        return {};
      }
      if (selector === selectAccountToGroupMap) {
        return {};
      }
      return undefined;
    });

    mockFormatFiat.mockReturnValue('$100.50');
    useAssetFiatFormatterMock.mockReturnValue({
      format: mockFormatFiat,
      fiatCurrency: 'USD',
    });

    useTokenFiatRatesMock.mockImplementation((requests) =>
      requests.map(() => 1),
    );

    mockGetNetworkBadgeSource.mockReturnValue('network-badge-source');
    mockIsTestNet.mockReturnValue(false);
    mockUseTokensData.mockReturnValue({});
    mockBuildEvmCaip19AssetId.mockImplementation(
      (address: string, chainId: Hex) =>
        `eip155:${chainId}/erc20:${address.toLowerCase()}`,
    );
  });

  it('returns all assets with balance', () => {
    const { result } = renderHook(() => useAccountTokens());

    expect(result.current).toHaveLength(2);
    expect(result.current[0].symbol).toBe('TOKEN1');
    expect(result.current[1].symbol).toBe('SOLTOKEN1');
  });

  it('filters out assets with zero balance', () => {
    const { result } = renderHook(() => useAccountTokens());

    const symbols = result.current.map((asset) => asset.symbol);
    expect(symbols).not.toContain('TOKEN2');
  });

  it('returns all asset types without filtering by account type', () => {
    const { result } = renderHook(() => useAccountTokens());

    const accountTypes = result.current.map((asset) => asset.accountType);
    expect(accountTypes).toContain('eip155:1/erc20:0xtoken1');
    expect(accountTypes).toContain('solana:mainnet/spl:0xsoltoken1');
  });

  describe('asset processing', () => {
    it('adds network badge source to each asset', () => {
      const { result } = renderHook(() => useAccountTokens());

      result.current.forEach((asset) => {
        expect(asset.networkBadgeSource).toBe('network-badge-source');
      });
      expect(mockGetNetworkBadgeSource).toHaveBeenCalled();
    });

    it('adds token standard as ERC20', () => {
      const { result } = renderHook(() => useAccountTokens());

      result.current.forEach((asset) => {
        expect(asset.standard).toBe(TokenStandard.ERC20);
      });
    });

    it('formats balance in selected currency for EVM assets', () => {
      const { result } = renderHook(() => useAccountTokens());

      const evmRows = result.current.filter((a) =>
        (a.chainId as string).startsWith('0x'),
      );
      expect(evmRows.length).toBeGreaterThan(0);
      evmRows.forEach((asset) => {
        expect(asset.balanceInSelectedCurrency).toBe('$100.50');
      });
    });

    it('passes each asset balance * fiat rate to the formatter', () => {
      const balanceAssets = {
        '0x1': [
          {
            chainId: '0x1',
            address: '0xtoken1',
            accountType: 'eip155:1/erc20:0xtoken1',
            balance: '100',
            fiat: { balance: '100' },
            rawBalance: '0x1234',
            symbol: 'TOKEN1',
          },
          {
            chainId: '0x1',
            address: '0xtoken2',
            accountType: 'eip155:1/erc20:0xtoken2',
            balance: '50',
            fiat: { balance: '100.50' },
            rawBalance: '0x5678',
            symbol: 'TOKEN2',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        balanceAssets as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return balanceAssets;
        }
        return undefined;
      });
      useTokenFiatRatesMock.mockReturnValue([2, 3]);

      renderHook(() => useAccountTokens());

      const calls = mockFormatFiat.mock.calls.map((args) =>
        args[0]?.toString(),
      );
      expect(calls).toContain('200');
      expect(calls).toContain('150');
    });
  });

  describe('sorting', () => {
    it('sorts assets by fiat balance in descending order', () => {
      const sortTestAssets = {
        '0x1': [
          {
            chainId: '0x1',
            accountType: 'eip155:1/erc20:0xtoken1',
            fiat: { balance: '50.25' },
            rawBalance: '0x1234',
            symbol: 'TOKEN1',
          },
          {
            chainId: '0x1',
            accountType: 'eip155:1/erc20:0xtoken2',
            fiat: { balance: '100.75' },
            rawBalance: '0x5678',
            symbol: 'TOKEN2',
          },
          {
            chainId: '0x1',
            accountType: 'eip155:1/erc20:0xtoken3',
            fiat: { balance: '25.50' },
            rawBalance: '0x9abc',
            symbol: 'TOKEN3',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sortTestAssets as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return sortTestAssets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current[0].symbol).toBe('TOKEN2');
      expect(result.current[1].symbol).toBe('TOKEN1');
      expect(result.current[2].symbol).toBe('TOKEN3');
    });
  });

  describe('show fiat on testnets setting', () => {
    const mixedAssets = {
      '0x1': [
        {
          chainId: '0x1',
          address: '0xtoken1',
          accountType: 'eip155:1/erc20:0xtoken1',
          balance: '10',
          fiat: { balance: '10' },
          rawBalance: '0x1234',
          symbol: 'MAINNET_TOKEN',
        },
      ],
      '0xaa36a7': [
        {
          chainId: '0xaa36a7',
          address: '0xnative',
          accountType: 'eip155:11155111/slip44:60',
          balance: '1000',
          fiat: { balance: '1000' },
          rawBalance: '0x5678',
          symbol: 'SepoliaETH',
        },
      ],
    };

    const setupSelectors = (showFiatOnTestnets: boolean) => {
      mockIsTestNet.mockImplementation((chainId) => chainId === '0xaa36a7');
      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mixedAssets as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return mixedAssets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        if (selector === selectShowFiatInTestnets) {
          return showFiatOnTestnets;
        }
        return undefined;
      });
    };

    it('hides fiat for testnet assets when the setting is disabled', () => {
      setupSelectors(false);

      const { result } = renderHook(() => useAccountTokens());

      const testnetAsset = result.current.find(
        (asset) => asset.symbol === 'SepoliaETH',
      );
      const mainnetAsset = result.current.find(
        (asset) => asset.symbol === 'MAINNET_TOKEN',
      );

      expect(testnetAsset?.balanceInSelectedCurrency).toBeUndefined();
      expect(mainnetAsset?.balanceInSelectedCurrency).toBe('$100.50');
    });

    it('shows fiat for testnet assets when the setting is enabled', () => {
      setupSelectors(true);

      const { result } = renderHook(() => useAccountTokens());

      const testnetAsset = result.current.find(
        (asset) => asset.symbol === 'SepoliaETH',
      );

      expect(testnetAsset?.balanceInSelectedCurrency).toBe('$100.50');
    });

    it('sorts testnet assets below mainnet assets when the setting is disabled', () => {
      setupSelectors(false);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current[0].symbol).toBe('MAINNET_TOKEN');
      expect(result.current[1].symbol).toBe('SepoliaETH');
    });

    it('sorts testnet assets by fiat when the setting is enabled', () => {
      setupSelectors(true);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current[0].symbol).toBe('SepoliaETH');
      expect(result.current[1].symbol).toBe('MAINNET_TOKEN');
    });
  });

  describe('edge cases', () => {
    it('handles empty assets object', () => {
      mockSelectAssetsBySelectedAccountGroup.mockReturnValue({});
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return {};
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toEqual([]);
    });

    it('handles assets without fiat balance and zero raw balance', () => {
      const assetsWithoutFiat = {
        '0x1': [
          {
            chainId: '0x1',
            accountType: 'eip155:1/erc20:0xtoken1',
            rawBalance: '0x0',
            symbol: 'TOKEN1',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assetsWithoutFiat as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return assetsWithoutFiat;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toEqual([]);
    });

    it('includes assets without fiat balance but with non-zero raw balance', () => {
      const assetsWithoutFiat = {
        '0x1': [
          {
            chainId: '0x1',
            accountType: 'eip155:1/erc20:0xtoken1',
            rawBalance: '0x1234',
            symbol: 'TOKEN1',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assetsWithoutFiat as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return assetsWithoutFiat;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('TOKEN1');
    });

    it('excludes assets with null fiat balance and zero raw balance', () => {
      const assetsWithNullFiat = {
        '0x1': [
          {
            chainId: '0x1',
            accountType: 'eip155:1/erc20:0xtoken1',
            fiat: { balance: null },
            rawBalance: '0x0',
            symbol: 'TOKEN1',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assetsWithNullFiat as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return assetsWithNullFiat;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toEqual([]);
    });

    it('includes assets with null fiat balance but non-zero raw balance', () => {
      const assetsWithNullFiat = {
        '0x1': [
          {
            chainId: '0x1',
            accountType: 'eip155:1/erc20:0xtoken1',
            fiat: { balance: null },
            rawBalance: '0x5678',
            symbol: 'TOKEN1',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assetsWithNullFiat as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return assetsWithNullFiat;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('TOKEN1');
    });

    it('includes test network assets with non-zero raw balance even without fiat balance', () => {
      const testNetAssets = {
        '0x5': [
          {
            chainId: '0x5',
            accountType: 'eip155:5/erc20:0xtoken1',
            rawBalance: '0x1234',
            symbol: 'TESTTOKEN',
          },
        ],
      };

      mockIsTestNet.mockReturnValue(true);
      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        testNetAssets as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return testNetAssets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('TESTTOKEN');
      expect(mockIsTestNet).toHaveBeenCalledWith('0x5');
    });

    it('excludes test network assets with zero raw balance and no fiat balance', () => {
      const testNetAssets = {
        '0x5': [
          {
            chainId: '0x5',
            accountType: 'eip155:5/erc20:0xtoken1',
            rawBalance: '0x0',
            symbol: 'TESTTOKEN',
          },
        ],
      };

      mockIsTestNet.mockReturnValue(true);
      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        testNetAssets as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return testNetAssets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toEqual([]);
      expect(mockIsTestNet).toHaveBeenCalledWith('0x5');
    });

    it('includes all assets when includeNoBalance is true', () => {
      const assets = {
        '0x1': [
          {
            chainId: '0x1',
            accountType: 'eip155:1/erc20:0xtoken1',
            fiat: { balance: '0' },
            rawBalance: '0x0',
            symbol: 'TOKEN1',
          },
          {
            chainId: '0x1',
            accountType: 'eip155:1/erc20:0xtoken2',
            fiat: { balance: null },
            rawBalance: '0x0',
            symbol: 'TOKEN2',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assets as any,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return assets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useAccountTokens({ includeNoBalance: true }),
      );

      expect(result.current).toHaveLength(2);
      expect(result.current[0].symbol).toBe('TOKEN1');
      expect(result.current[1].symbol).toBe('TOKEN2');
    });
  });

  describe('tokenFilter', () => {
    it('excludes owned assets without chainId when tokenFilter is provided', () => {
      const accountAssets = {
        '0x1': [
          {
            address: '0xtoken1',
            chainId: '0x1',
            fiat: { balance: '50' },
            rawBalance: '0x1234',
            symbol: 'TOKEN1',
            assetId: '0xtoken1',
          },
          {
            address: '0xtoken2',
            chainId: '',
            fiat: { balance: '100' },
            rawBalance: '0x5678',
            symbol: 'TOKEN2',
            assetId: '0xtoken2',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        accountAssets as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return accountAssets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const filter = () => true;

      const { result } = renderHook(() =>
        useAccountTokens({ tokenFilter: filter }),
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('TOKEN1');
    });

    it('excludes owned assets without assetId when tokenFilter is provided', () => {
      const accountAssets = {
        '0x1': [
          {
            address: '0xtoken1',
            chainId: '0x1',
            fiat: { balance: '50' },
            rawBalance: '0x1234',
            symbol: 'TOKEN1',
            assetId: '0xtoken1',
          },
          {
            address: '0xtoken2',
            chainId: '0x1',
            fiat: { balance: '100' },
            rawBalance: '0x5678',
            symbol: 'TOKEN2',
            assetId: '',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        accountAssets as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return accountAssets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const filter = () => true;

      const { result } = renderHook(() =>
        useAccountTokens({ tokenFilter: filter }),
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('TOKEN1');
    });
  });

  describe('enrichTokenRequests', () => {
    it('adds zero-balance entries from API data for tokens not in wallet', () => {
      mockSelectAssetsBySelectedAccountGroup.mockReturnValue({});
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return {};
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const requests = [{ chainId: '0x1' as Hex, address: '0xusdc' }];

      mockUseTokensData.mockReturnValue({
        'eip155:0x1/erc20:0xusdc': {
          assetId: 'eip155:0x1/erc20:0xusdc',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          iconUrl: 'https://example.com/usdc.png',
        },
      });

      const { result } = renderHook(() =>
        useAccountTokens({ enrichTokenRequests: requests }),
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('USDC');
      expect(result.current[0].balance).toBe('0');
      expect(result.current[0].decimals).toBe(6);
      expect(result.current[0].image).toBe('https://example.com/usdc.png');
    });

    it('does not duplicate tokens already in wallet', () => {
      const accountAssets = {
        '0x1': [
          {
            chainId: '0x1',
            address: '0xusdc',
            accountType: 'eip155:1/erc20:0xusdc',
            fiat: { balance: '100' },
            rawBalance: '0x1234',
            symbol: 'USDC',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        accountAssets as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return accountAssets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const requests = [{ chainId: '0x1' as Hex, address: '0xusdc' }];

      mockUseTokensData.mockReturnValue({
        'eip155:0x1/erc20:0xusdc': {
          assetId: 'eip155:0x1/erc20:0xusdc',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          iconUrl: 'https://example.com/usdc.png',
        },
      });

      const { result } = renderHook(() =>
        useAccountTokens({ enrichTokenRequests: requests }),
      );

      const usdcEntries = result.current.filter((a) => a.symbol === 'USDC');
      expect(usdcEntries).toHaveLength(1);
      expect(usdcEntries[0].balance).not.toBe('0');
    });

    it('skips API entries with no name and no symbol', () => {
      mockSelectAssetsBySelectedAccountGroup.mockReturnValue({});
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return {};
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const requests = [{ chainId: '0x1' as Hex, address: '0xunknown' }];

      mockUseTokensData.mockReturnValue({});

      const { result } = renderHook(() =>
        useAccountTokens({ enrichTokenRequests: requests }),
      );

      expect(result.current).toHaveLength(0);
    });

    it('does not add enrichment entries when enrichTokenRequests is empty', () => {
      mockSelectAssetsBySelectedAccountGroup.mockReturnValue({});
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return {};
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useAccountTokens({ enrichTokenRequests: [] }),
      );

      expect(result.current).toHaveLength(0);
    });
  });

  describe('accountOverride', () => {
    const overrideAssets = {
      '0x89': [
        {
          chainId: '0x89',
          accountType: 'eip155:1/erc20:0xoverride',
          fiat: { balance: '500' },
          rawBalance: '0xAAAA',
          symbol: 'OVERRIDE',
        },
      ],
    };

    it('uses accountOverride assets when it resolves to an account group', () => {
      useTransactionAccountOverrideMock.mockReturnValue(
        '0xFromAddress' as never,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return mockAssets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        if (selector === selectInternalAccountsById) {
          return {
            'acc-1': { address: '0xFromAddress' },
          };
        }
        if (selector === selectAccountToGroupMap) {
          return {
            'acc-1': { id: 'group-from' },
          };
        }
        return overrideAssets;
      });

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('OVERRIDE');
    });

    it('returns empty list when accountOverride is set but has no loaded assets', () => {
      useTransactionAccountOverrideMock.mockReturnValue(
        '0xEmptyAddress' as never,
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return mockAssets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        if (selector === selectInternalAccountsById) {
          return {
            'acc-empty': { address: '0xEmptyAddress' },
          };
        }
        if (selector === selectAccountToGroupMap) {
          return {
            'acc-empty': { id: 'group-empty' },
          };
        }
        return {};
      });

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toEqual([]);
    });

    it('falls back to global assets when accountOverride is undefined', () => {
      useTransactionAccountOverrideMock.mockReturnValue(undefined);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(2);
      expect(result.current[0].symbol).toBe('TOKEN1');
    });
  });

  describe('fiat formatter delegation', () => {
    it('sets balanceInSelectedCurrency to the formatter output for EVM assets', () => {
      mockFormatFiat.mockReturnValue('$110.00');

      const { result } = renderHook(() => useAccountTokens());

      const evmRows = result.current.filter((a) =>
        (a.chainId as string).startsWith('0x'),
      );
      expect(evmRows.length).toBeGreaterThan(0);
      evmRows.forEach((asset) => {
        expect(asset.balanceInSelectedCurrency).toBe('$110.00');
      });
    });

    it('formats non-EVM assets using their preferred-currency fiat balance', () => {
      mockFormatFiat.mockImplementation((v) =>
        v === undefined ? undefined : `formatted:${String(v)}`,
      );

      const { result } = renderHook(() => useAccountTokens());

      const nonEvm = result.current.find((a) => a.chainId === 'solana:mainnet');
      expect(nonEvm?.balanceInSelectedCurrency).toBe('formatted:50.25');
    });

    it('does not use useTokenFiatRates output for non-EVM assets', () => {
      useTokenFiatRatesMock.mockReturnValue([999]);
      mockFormatFiat.mockImplementation((v) =>
        v === undefined ? undefined : `formatted:${String(v)}`,
      );

      const { result } = renderHook(() => useAccountTokens());

      const nonEvm = result.current.find((a) => a.chainId === 'solana:mainnet');
      expect(nonEvm?.balanceInSelectedCurrency).toBe('formatted:50.25');
    });

    it('propagates undefined from the formatter as a hidden fiat value', () => {
      mockFormatFiat.mockReturnValue(undefined);

      const { result } = renderHook(() => useAccountTokens());

      result.current.forEach((asset) => {
        expect(asset.balanceInSelectedCurrency).toBeUndefined();
      });
    });

    it('does not call the formatter for testnet assets when fiat is hidden', () => {
      const testnetOnlyAssets = {
        '0x5': [
          {
            chainId: '0x5',
            address: '0xtoken1',
            accountType: 'eip155:5/erc20:0xtoken1',
            balance: '100.50',
            fiat: { balance: '100.50' },
            rawBalance: '0x1234',
            symbol: 'TOKEN1',
          },
        ],
      };

      mockIsTestNet.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return testnetOnlyAssets;
        }
        if (selector === selectShowFiatInTestnets) {
          return false;
        }
        return undefined;
      });

      renderHook(() => useAccountTokens());

      expect(mockFormatFiat).not.toHaveBeenCalled();
    });
  });
});
