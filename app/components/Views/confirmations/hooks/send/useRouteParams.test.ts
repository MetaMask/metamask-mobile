import { waitFor } from '@testing-library/react-native';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useParams } from '../../../../../util/navigation/navUtils';
import { AssetType, Nft } from '../../types/token';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { useAccountTokens } from './useAccountTokens';
import { useEVMNfts } from './useNfts';
import { useRouteParams } from './useRouteParams';

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('./useAccountTokens', () => ({
  useAccountTokens: jest.fn(),
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

const mockUseAccountTokens = useAccountTokens as jest.MockedFunction<
  typeof useAccountTokens
>;

const mockUseNfts = useEVMNfts as jest.MockedFunction<typeof useEVMNfts>;

describe('useRouteParams', () => {
  it('call function mockUpdateAsset by default with asset passed', async () => {
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
    mockUseAccountTokens.mockReturnValue([]);
    mockUseNfts.mockReturnValue([]);

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith(asset);
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
    mockUseAccountTokens.mockReturnValue([]);
    mockUseNfts.mockReturnValue([]);

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).not.toHaveBeenCalled();
    });
  });

  it('call function mockUpdateAsset with token if returned by useAccountTokens', async () => {
    const asset = {
      id: '123',
      address: 'dummy_address',
      chainId: 'dummy_chainId',
    };
    const assetToken = {
      id: '123',
      address: 'dummy_address',
      chainId: 'dummy_chainId',
    };
    mockUseParams.mockReturnValue({ asset });
    const mockUpdateAsset = jest.fn();
    mockUseSendContext.mockReturnValue({
      updateAsset: mockUpdateAsset,
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseAccountTokens.mockReturnValue([assetToken as unknown as AssetType]);
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
    mockUseAccountTokens.mockReturnValue([]);
    mockUseNfts.mockReturnValue([assetNft as unknown as Nft]);

    renderHookWithProvider(() => useRouteParams(), mockState);

    await waitFor(() => {
      expect(mockUpdateAsset).toHaveBeenCalledWith(assetNft);
    });
  });
});
