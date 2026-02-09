import { useSelector } from 'react-redux';
import { waitFor } from '@testing-library/react-native';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useParams } from '../../../../../util/navigation/navUtils';
import { Nft } from '../../types/token';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { useEVMNfts } from './useNfts';
import { useRouteParams } from './useRouteParams';
import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';

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

describe('useRouteParams', () => {
  it('does not call function mockUpdateAsset if asset is not found and has no symbol', async () => {
    const asset = {
      id: '123',
      address: 'dummy_address',
      chainId: 'summy_chainId',
    };
    mockUseParams.mockReturnValue({ asset });
    const mockUpdateAsset = jest.fn();
    mockUseSendContext.mockReturnValue({
      updateAsset: mockUpdateAsset,
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAssetsBySelectedAccountGroup) {
        return { '0x1': [] };
      }
    });
    mockUseNfts.mockReturnValue([]);

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).not.toHaveBeenCalled();
    });
  });

  it('calls updateAsset with params asset when token not found but has symbol (zero balance scenario)', async () => {
    const asset = {
      id: '123',
      address: 'dummy_address',
      chainId: 'dummy_chainId',
      symbol: 'TEST',
      decimals: 18,
      name: 'Test Token',
    };
    mockUseParams.mockReturnValue({ asset });
    const mockUpdateAsset = jest.fn();
    mockUseSendContext.mockReturnValue({
      updateAsset: mockUpdateAsset,
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAssetsBySelectedAccountGroup) {
        return { '0x1': [] };
      }
    });
    mockUseNfts.mockReturnValue([]);

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
      chainId: 'dummy_chainId',
      ticker: 'ETH',
      decimals: 18,
      name: 'Ether',
    };
    mockUseParams.mockReturnValue({ asset });
    const mockUpdateAsset = jest.fn();
    mockUseSendContext.mockReturnValue({
      updateAsset: mockUpdateAsset,
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAssetsBySelectedAccountGroup) {
        return { '0x1': [] };
      }
    });
    mockUseNfts.mockReturnValue([]);

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
      chainId: 'summy_chainId',
    };
    mockUseParams.mockReturnValue({ asset });
    const mockUpdateAsset = jest.fn();
    mockUseSendContext.mockReturnValue({
      asset,
      updateAsset: mockUpdateAsset,
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAssetsBySelectedAccountGroup) {
        return { '0x1': [] };
      }
    });
    mockUseNfts.mockReturnValue([]);

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).not.toHaveBeenCalled();
    });
  });

  it('call function mockUpdateAsset with token if returned by selectAssetsBySelectedAccountGroup', async () => {
    const asset = {
      id: '123',
      address: 'dummy_address',
      chainId: 'dummy_chainId',
    };
    const assetToken = {
      id: '123',
      assetId: 'dummy_address',
      chainId: 'dummy_chainId',
    };
    mockUseParams.mockReturnValue({ asset });
    const mockUpdateAsset = jest.fn();
    mockUseSendContext.mockReturnValue({
      updateAsset: mockUpdateAsset,
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAssetsBySelectedAccountGroup) {
        return { '0x1': [assetToken] };
      }
    });
    mockUseNfts.mockReturnValue([]);

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith(assetToken);
    });
  });

  it('call function mockUpdateAsset with nft if returned by useNfts', async () => {
    const asset = {
      id: '123',
      address: 'dummy_address',
      chainId: 'summy_chainId',
    };
    const assetNft = {
      id: '123',
      address: 'dummy_address',
      chainId: 'summy_chainId',
    };
    mockUseParams.mockReturnValue({ asset });
    const mockUpdateAsset = jest.fn();
    mockUseSendContext.mockReturnValue({
      updateAsset: mockUpdateAsset,
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAssetsBySelectedAccountGroup) {
        return { '0x1': [] };
      }
    });
    mockUseNfts.mockReturnValue([assetNft as unknown as Nft]);

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith(assetNft);
    });
  });
});
