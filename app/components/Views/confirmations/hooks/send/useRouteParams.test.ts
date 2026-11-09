import { useSelector } from 'react-redux';
import { waitFor } from '@testing-library/react-native';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useParams } from '../../../../../util/navigation/navUtils';
import { AssetType, Nft } from '../../types/token';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { useEVMNfts } from './useNfts';
import { useRouteParams } from './useRouteParams';
import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('./useNfts', () => ({
  useEVMNfts: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockUseNfts = useEVMNfts as jest.MockedFunction<typeof useEVMNfts>;
const mockGetAccountByScope = jest.fn();
const mockUpdateAsset = jest.fn();

describe('useRouteParams', () => {
  let mockAssets: Record<string, Partial<AssetType>[]>;
  let mockMarketData: Record<string, Record<string, { price: number }>>;

  beforeEach(() => {
    mockUseParams.mockReset();
    mockUseSendContext.mockReset();
    mockUseSelector.mockReset();
    mockUseNfts.mockReset();
    mockGetAccountByScope.mockReset();
    mockUpdateAsset.mockReset();
    mockAssets = { '0x1': [] };
    mockMarketData = {};
    mockGetAccountByScope.mockReturnValue({ id: '123' });
    mockUseSendContext.mockReturnValue({
      updateAsset: mockUpdateAsset,
      updateTo: jest.fn(),
      updateValue: jest.fn(),
      maxValueMode: false,
    });
    mockUseNfts.mockReturnValue({ nfts: [], isLoading: false });
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountByScope) {
        return mockGetAccountByScope;
      }
      if (selector === selectAssetsBySelectedAccountGroup) {
        return mockAssets;
      }
      if (selector === selectTokenMarketData) {
        return mockMarketData;
      }
    });
  });

  it('does not call function mockUpdateAsset if asset is not found and has no symbol', async () => {
    const asset = {
      id: '123',
      address: 'dummy_address',
      chainId: '0x1',
    };
    mockUseParams.mockReturnValue({ asset });

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).not.toHaveBeenCalled();
    });
  });

  it('calls updateAsset with params asset when token not found but has symbol (zero balance scenario)', async () => {
    const asset = {
      id: '123',
      address: 'dummy_address',
      chainId: '0x1',
      symbol: 'TEST',
      decimals: 18,
      name: 'Test Token',
    };
    mockUseParams.mockReturnValue({ asset });

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith({
        ...asset,
        balance: '0',
        rawBalance: '0x0',
      });
    });
  });

  it('calls updateAsset with params asset when token not found but has ticker (zero balance scenario)', async () => {
    const asset = {
      id: '123',
      address: 'dummy_address',
      chainId: '0x1',
      ticker: 'ETH',
      decimals: 18,
      name: 'Ether',
    };
    mockUseParams.mockReturnValue({ asset });

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith({
        ...asset,
        balance: '0',
        rawBalance: '0x0',
      });
    });
  });

  it('does not call function mockUpdateAsset is asset is already defined', async () => {
    const asset = {
      id: '123',
      address: 'dummy_address',
      chainId: '0x1',
    };
    mockUseParams.mockReturnValue({ asset });
    mockUseSendContext.mockReturnValue({
      asset,
      updateAsset: mockUpdateAsset,
    } as unknown as ReturnType<typeof useSendContext>);

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).not.toHaveBeenCalled();
    });
  });

  it('call function mockUpdateAsset with token if returned by selectAssetsBySelectedAccountGroup', async () => {
    const asset = {
      id: '123',
      address: 'dummy_address',
      chainId: '0x1',
    };
    const assetToken = {
      id: '123',
      accountId: '123',
      assetId: 'dummy_address',
      chainId: '0x1',
    };
    mockUseParams.mockReturnValue({ asset });
    mockAssets = { '0x1': [assetToken] };

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith(assetToken);
    });
  });

  it.each(['0', '10'])(
    'selects the scoped account with TRX balance %s over another account holding the same asset',
    async (balance) => {
      const chainId = 'tron:728126428';
      const assetId = `${chainId}/slip44:195`;
      const tronAsset = {
        accountId: '123',
        assetId,
        chainId,
        balance,
      };
      const otherAccountAsset = {
        ...tronAsset,
        accountId: 'solana-account-id',
        balance: '0',
      };
      mockUseParams.mockReturnValue({
        asset: { address: assetId, chainId, symbol: 'TRX' },
      });
      mockAssets = { [chainId]: [otherAccountAsset, tronAsset] };

      renderHookWithProvider(() => useRouteParams(), mockState);

      await waitFor(() => {
        expect(mockUpdateAsset).toHaveBeenCalledWith(tronAsset);
      });
    },
  );

  // Regression (CONF-2189): `selectAssetsBySelectedAccountGroup` stores the
  // native-to-fiat currency rate in `fiat.conversionRate`, while the in-flow
  // token picker stores a complete token-to-fiat price. The route-param asset
  // is normalised to the latter so `useCurrencyConversions` can apply one rule.
  it('folds the token price into conversionRate for an EVM token', async () => {
    const asset = {
      id: '123',
      address: '0xtoken',
      chainId: '0x1',
    };
    // USDC: 0.00025 ETH per token, ETH at $4,000 -> $1.00 per token.
    const assetToken = {
      id: '123',
      accountId: '123',
      assetId: '0xtoken',
      address: '0xtoken',
      chainId: '0x1',
      isNative: false,
      fiat: { balance: 100, currency: 'usd', conversionRate: 4000 },
    };
    mockUseParams.mockReturnValue({ asset });
    mockAssets = { '0x1': [assetToken] };
    mockMarketData = { '0x1': { '0xtoken': { price: 0.00025 } } };

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith({
        ...assetToken,
        fiat: { balance: 100, currency: 'usd', conversionRate: 1 },
      });
    });
  });

  it('leaves conversionRate untouched for a native coin', async () => {
    const asset = {
      id: '123',
      address: '0xnative',
      chainId: '0x1',
    };
    const assetToken = {
      id: '123',
      accountId: '123',
      assetId: '0xnative',
      address: '0xnative',
      chainId: '0x1',
      isNative: true,
      fiat: { balance: 4000, currency: 'usd', conversionRate: 4000 },
    };
    mockUseParams.mockReturnValue({ asset });
    mockAssets = { '0x1': [assetToken] };
    mockMarketData = { '0x1': {} };

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith(assetToken);
    });
  });

  it('leaves conversionRate untouched when the token has no market data', async () => {
    const asset = {
      id: '123',
      address: '0xtoken',
      chainId: '0x1',
    };
    const assetToken = {
      id: '123',
      accountId: '123',
      assetId: '0xtoken',
      address: '0xtoken',
      chainId: '0x1',
      isNative: false,
      fiat: { balance: 100, currency: 'usd', conversionRate: 4000 },
    };
    mockUseParams.mockReturnValue({ asset });
    mockAssets = { '0x1': [assetToken] };
    mockMarketData = { '0x1': {} };

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith(assetToken);
    });
  });

  it('call function mockUpdateAsset with nft if returned by useNfts', async () => {
    const asset = {
      id: '123',
      address: 'dummy_address',
      chainId: '0x1',
      tokenId: '1',
    };
    const assetNft = {
      id: '123',
      address: 'dummy_address',
      chainId: '0x1',
      tokenId: '1',
    };
    mockUseParams.mockReturnValue({ asset });
    mockUseNfts.mockReturnValue({
      nfts: [assetNft as unknown as Nft],
      isLoading: false,
    });

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith(assetNft);
    });
  });

  it('matches ERC1155 token by tokenId when multiple tokens share the same contract and chain', async () => {
    const targetTokenId = '42';
    const paramsAsset = {
      address: '0xcontract',
      chainId: '0x1',
      tokenId: targetTokenId,
    };
    const wrongNft = {
      address: '0xcontract',
      chainId: '0x1',
      tokenId: '1',
      standard: 'ERC1155',
      balance: '5',
    };
    const correctNft = {
      address: '0xcontract',
      chainId: '0x1',
      tokenId: targetTokenId,
      standard: 'ERC1155',
      balance: '2',
    };
    mockUseParams.mockReturnValue({ asset: paramsAsset });
    mockUseNfts.mockReturnValue({
      nfts: [wrongNft, correctNft] as unknown as Nft[],
      isLoading: false,
    });

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith(correctNft);
      expect(mockUpdateAsset).not.toHaveBeenCalledWith(wrongNft);
    });
  });

  describe('isLoading', () => {
    it('returns true while NFTs are loading and NFT asset is not resolved yet', async () => {
      const asset = {
        id: '123',
        address: 'dummy_address',
        chainId: '0x1',
        tokenId: '42',
      };
      mockUseParams.mockReturnValue({ asset });
      mockUseNfts.mockReturnValue({ nfts: [], isLoading: true });

      const { result } = renderHookWithProvider(
        () => useRouteParams(),
        mockState,
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when NFTs finish loading and the asset is resolved', async () => {
      const asset = {
        id: '123',
        address: 'dummy_address',
        chainId: '0x1',
        tokenId: '42',
      };
      mockUseParams.mockReturnValue({ asset });
      mockUseSendContext.mockReturnValue({
        asset,
        updateAsset: jest.fn(),
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useRouteParams(),
        mockState,
      );

      expect(result.current.isLoading).toBe(false);
    });

    it('returns false when the params asset has no tokenId (non-NFT flow)', async () => {
      const asset = {
        id: '123',
        address: 'dummy_address',
        chainId: '0x1',
        symbol: 'ETH',
      };
      mockUseParams.mockReturnValue({ asset });
      mockUseNfts.mockReturnValue({ nfts: [], isLoading: true });

      const { result } = renderHookWithProvider(
        () => useRouteParams(),
        mockState,
      );

      expect(result.current.isLoading).toBe(false);
    });
  });
});
