import { handleAssetUrl } from '../handleAssetUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
// eslint-disable-next-line import/no-namespace
import * as UseAssetMetadataModule from '../../../../../components/UI/Bridge/hooks/useAssetMetadata/utils';
import { Hex } from '@metamask/utils';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

type TokenMetadata = Awaited<
  ReturnType<(typeof UseAssetMetadataModule)['fetchAssetMetadata']>
>;

const createMockTokenMetadata = (): TokenMetadata => ({
  assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000001',
  symbol: 'TEST',
  name: 'Test Token',
  decimals: 18,
  image:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x0000000000000000000000000000000000000001.png',
  rwaData: undefined,
  address: '', // not used in impl
  chainId: '' as Hex, // not used in impl
});

describe('handleAssetUrl', () => {
  const arrangeMocks = () => {
    const mockNavigate = jest.mocked(NavigationService.navigation.navigate);
    const mockFetchAssetMetadata = jest
      .spyOn(UseAssetMetadataModule, 'fetchAssetMetadata')
      .mockResolvedValue(createMockTokenMetadata());

    return {
      mockNavigate,
      mockFetchAssetMetadata,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to Asset view for ERC20 asset metadata', async () => {
    const { mockNavigate } = arrangeMocks();

    await handleAssetUrl({
      assetPath:
        '?assetId=eip155:1/erc20:0x0000000000000000000000000000000000000001',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        address: '0x0000000000000000000000000000000000000001',
        chainId: '0x1',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
        image:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x0000000000000000000000000000000000000001.png',
        logo: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x0000000000000000000000000000000000000001.png',
        balance: '0',
        isNative: false,
        isETH: undefined,
      }),
    );
  });

  it('navigates to Asset view for native assets', async () => {
    const { mockNavigate } = arrangeMocks();

    await handleAssetUrl({
      assetPath: '?assetId=eip155:1/slip44:60',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
        isNative: true,
      }),
    );
  });

  it('returns early when asset parameter is missing', async () => {
    const { mockNavigate } = arrangeMocks();

    await handleAssetUrl({ assetPath: '' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('returns early when asset parameter is not CAIP-19', async () => {
    const { mockNavigate } = arrangeMocks();

    await handleAssetUrl({ assetPath: '?assetId=invalid' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to WALLET.HOME when asset metadata is missing', async () => {
    const { mockNavigate, mockFetchAssetMetadata } = arrangeMocks();
    mockFetchAssetMetadata.mockRejectedValue(new Error('Test Error'));

    await handleAssetUrl({
      assetPath:
        '?assetId=eip155:1/erc20:0x0000000000000000000000000000000000000001',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });
});
