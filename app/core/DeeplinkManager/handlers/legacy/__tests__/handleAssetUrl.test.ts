import { handleAssetUrl } from '../handleAssetUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { handleFetch } from '@metamask/controller-utils';
import { getAssetImageUrl } from '../../../../../components/UI/Bridge/hooks/useAssetMetadata/utils';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../../constants/bridge';

jest.mock('../../../../../constants/bridge', () => ({
  NATIVE_SWAPS_TOKEN_ADDRESS: '0x0000000000000000000000000000000000000000',
}));
jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');
jest.mock('@metamask/controller-utils', () => ({
  handleFetch: jest.fn(),
}));
jest.mock(
  '../../../../../components/UI/Bridge/hooks/useAssetMetadata/utils',
  () => ({
    ...jest.requireActual(
      '../../../../../components/UI/Bridge/hooks/useAssetMetadata/utils',
    ),
    getAssetImageUrl: jest.fn(),
  }),
);

const mockHandleFetch = handleFetch as jest.Mock;
const mockGetAssetImageUrl = getAssetImageUrl as jest.Mock;

describe('handleAssetUrl', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    (DevLogger.log as jest.Mock) = jest.fn();
    (Logger.error as jest.Mock) = jest.fn();
    mockGetAssetImageUrl.mockReturnValue('https://image.example/token.png');
  });

  it('navigates to Asset view for ERC20 asset metadata', async () => {
    mockHandleFetch.mockResolvedValue([
      {
        assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000001',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
      },
    ]);

    await handleAssetUrl({
      assetPath:
        '?asset=eip155:1/erc20:0x0000000000000000000000000000000000000001',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        address: '0x0000000000000000000000000000000000000001',
        chainId: '0x1',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
        image: 'https://image.example/token.png',
        logo: 'https://image.example/token.png',
        balance: '0',
        isNative: false,
        isETH: false,
      }),
    );
  });

  it('navigates to Asset view for native assets', async () => {
    mockHandleFetch.mockResolvedValue([
      {
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
      },
    ]);

    await handleAssetUrl({
      assetPath: '?asset=eip155:1/slip44:60',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        address: NATIVE_SWAPS_TOKEN_ADDRESS,
        chainId: '0x1',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        isNative: true,
        isETH: true,
      }),
    );
  });

  it('returns early when asset parameter is missing', async () => {
    await handleAssetUrl({ assetPath: '' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('returns early when asset metadata is missing', async () => {
    mockHandleFetch.mockResolvedValue([]);

    await handleAssetUrl({
      assetPath:
        '?asset=eip155:1/erc20:0x0000000000000000000000000000000000000001',
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to WALLET.HOME on navigation error', async () => {
    mockHandleFetch.mockResolvedValue([
      {
        assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000001',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
      },
    ]);
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation error');
    });

    await handleAssetUrl({
      assetPath:
        '?asset=eip155:1/erc20:0x0000000000000000000000000000000000000001',
    });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET.HOME);
  });
});
