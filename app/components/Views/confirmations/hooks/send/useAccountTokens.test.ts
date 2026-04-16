import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';

import { useAccountTokens } from './useAccountTokens';
import { getNetworkBadgeSource } from '../../utils/network';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { TokenStandard } from '../../types/token';
import {
  selectAssetsBySelectedAccountGroup,
  selectAssetsByAccountGroupId,
} from '../../../../../selectors/assets/assets-list';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { isTestNet } from '../../../../../util/networks';
import { useTokensData } from '../../../../hooks/useTokensData/useTokensData';
import { buildEvmCaip19AssetId } from '../../../../../util/multichain/buildEvmCaip19AssetId';
import { Hex } from '@metamask/utils';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../utils/network', () => ({
  getNetworkBadgeSource: jest.fn(),
}));

jest.mock('../../../../../util/intl', () => ({
  getIntlNumberFormatter: jest.fn(),
}));

jest.mock('../../../../../util/networks', () => ({
  isTestNet: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  locale: 'en-US',
  strings: jest.fn((key: string) => key),
}));

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));
const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);

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

jest.mock('../../../../hooks/useTokensData/useTokensData');
jest.mock('../../../../../util/multichain/buildEvmCaip19AssetId');

const mockUseSelector = jest.mocked(useSelector);
const mockGetNetworkBadgeSource = jest.mocked(getNetworkBadgeSource);
const mockGetIntlNumberFormatter = jest.mocked(getIntlNumberFormatter);
const mockSelectAssetsBySelectedAccountGroup = jest.mocked(
  selectAssetsBySelectedAccountGroup,
);
const mockSelectCurrentCurrency = jest.mocked(selectCurrentCurrency);
const mockIsTestNet = jest.mocked(isTestNet);
const mockUseTokensData = jest.mocked(useTokensData);
const mockBuildEvmCaip19AssetId = jest.mocked(buildEvmCaip19AssetId);

const mockAssets = {
  '0x1': [
    {
      chainId: '0x1',
      accountType: 'eip155:1/erc20:0xtoken1',
      fiat: { balance: '100.50' },
      rawBalance: '0x1234',
      symbol: 'TOKEN1',
    },
    {
      chainId: '0x1',
      accountType: 'eip155:1/erc20:0xtoken2',
      fiat: { balance: '0' },
      rawBalance: '0x0',
      symbol: 'TOKEN2',
    },
  ],
  'solana:mainnet': [
    {
      chainId: 'solana:mainnet',
      accountType: 'solana:mainnet/spl:0xsoltoken1',
      fiat: { balance: '50.25' },
      rawBalance: '0x5678',
      symbol: 'SOLTOKEN1',
    },
  ],
};

const mockFormatter = {
  format: jest.fn(),
};

describe('useAccountTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue(undefined);

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

    mockGetNetworkBadgeSource.mockReturnValue('network-badge-source');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetIntlNumberFormatter.mockReturnValue(mockFormatter as any);
    mockFormatter.format.mockReturnValue('$100.50');
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

    it('formats balance in selected currency', () => {
      const { result } = renderHook(() => useAccountTokens());

      result.current.forEach((asset) => {
        expect(asset.balanceInSelectedCurrency).toBe('$100.50');
      });
    });

    it('handles integer amounts without decimals', () => {
      const integerAssets = {
        '0x1': [
          {
            chainId: '0x1',
            accountType: 'eip155:1/erc20:0xtoken1',
            fiat: { balance: '100' },
            rawBalance: '0x1234',
            symbol: 'TOKEN1',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        integerAssets as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return integerAssets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      renderHook(() => useAccountTokens());

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      });
    });

    it('handles decimal amounts with fraction digits', () => {
      const decimalAssets = {
        '0x1': [
          {
            chainId: '0x1',
            accountType: 'eip155:1/erc20:0xtoken1',
            fiat: { balance: '100.50' },
            rawBalance: '0x1234',
            symbol: 'TOKEN1',
          },
        ],
      };

      mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        decimalAssets as any,
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) {
          return decimalAssets;
        }
        if (selector === selectCurrentCurrency) {
          return 'USD';
        }
        return undefined;
      });

      renderHook(() => useAccountTokens());

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      });
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

  describe('txParams.from override', () => {
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

    it('uses from account assets when accountAddress resolves to an account group', () => {
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

      const { result } = renderHook(() =>
        useAccountTokens({ accountAddress: '0xFromAddress' }),
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].symbol).toBe('OVERRIDE');
    });

    it('falls back to global assets when txParams.from is not available', () => {
      useTransactionMetadataRequestMock.mockReturnValue(undefined);

      const { result } = renderHook(() => useAccountTokens());

      expect(result.current).toHaveLength(2);
      expect(result.current[0].symbol).toBe('TOKEN1');
    });
  });
});
