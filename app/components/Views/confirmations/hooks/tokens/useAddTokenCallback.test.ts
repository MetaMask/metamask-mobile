import Engine from '../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act } from '@testing-library/react-native';
import { useAddTokenCallback } from './useAddTokenCallback';
import { selectIsAssetsUnifyStateEnabled } from '../../../../../selectors/featureFlagController/assetsUnifyState';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    TokensController: {
      addToken: jest.fn(),
    },
    AssetsController: {
      addCustomAsset: jest.fn(),
    },
  },
}));

jest.mock(
  '../../../../../selectors/featureFlagController/assetsUnifyState',
  () => ({
    selectIsAssetsUnifyStateEnabled: jest.fn(() => false),
  }),
);

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(() => null),
  }),
);

const ACCOUNT_ID_MOCK = 'mock-account-id';
const TOKEN_ADDRESS_MOCK = '0x1234' as const;
const CHAIN_ID_MOCK = '0x1' as const;
const NETWORK_CLIENT_ID = 'mockNetworkClientId';
const SYMBOL_MOCK = 'TST';
const DECIMALS_MOCK = 6;
const NAME_MOCK = 'Test Token';

const TOKEN_REQUEST = {
  tokenAddress: TOKEN_ADDRESS_MOCK,
  chainId: CHAIN_ID_MOCK,
  symbol: SYMBOL_MOCK,
  decimals: DECIMALS_MOCK,
  name: NAME_MOCK,
};

describe('useAddTokenCallback', () => {
  const mockAddToken = jest.mocked(Engine.context.TokensController.addToken);
  const mockAddCustomAsset = jest.mocked(
    Engine.context.AssetsController.addCustomAsset,
  );
  const mockFindNetworkClientIdByChainId = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    mockFindNetworkClientIdByChainId.mockReturnValue(NETWORK_CLIENT_ID);
    mockAddToken.mockResolvedValue([]);
    mockAddCustomAsset.mockResolvedValue(undefined);
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      false,
    );
    (
      selectSelectedAccountGroupEvmInternalAccount as unknown as jest.Mock
    ).mockReturnValue({
      id: ACCOUNT_ID_MOCK,
      address: '0xabc',
      type: 'eip155:eoa',
    });
  });

  it('returns a callback function', () => {
    const { result } = renderHookWithProvider(useAddTokenCallback);
    expect(typeof result.current).toBe('function');
  });

  it('adds token via TokensController', async () => {
    const { result } = renderHookWithProvider(useAddTokenCallback);

    await act(async () => {
      await result.current(TOKEN_REQUEST);
    });

    expect(mockAddToken).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_MOCK,
      decimals: DECIMALS_MOCK,
      name: NAME_MOCK,
      networkClientId: NETWORK_CLIENT_ID,
      symbol: SYMBOL_MOCK,
    });
  });

  it('does not call addCustomAsset when assetsUnifyState is disabled', async () => {
    const { result } = renderHookWithProvider(useAddTokenCallback);

    await act(async () => {
      await result.current(TOKEN_REQUEST);
    });

    expect(mockAddToken).toHaveBeenCalled();
    expect(mockAddCustomAsset).not.toHaveBeenCalled();
  });

  it('calls addCustomAsset when assetsUnifyState is enabled', async () => {
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      true,
    );

    const { result } = renderHookWithProvider(useAddTokenCallback);

    await act(async () => {
      await result.current(TOKEN_REQUEST);
    });

    expect(mockAddToken).toHaveBeenCalled();
    expect(mockAddCustomAsset).toHaveBeenCalledWith(
      ACCOUNT_ID_MOCK,
      expect.stringContaining('erc20'),
      {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        decimals: DECIMALS_MOCK,
        name: NAME_MOCK,
        symbol: SYMBOL_MOCK,
      },
    );
  });

  it('skips addCustomAsset when no accountId', async () => {
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      true,
    );
    (
      selectSelectedAccountGroupEvmInternalAccount as unknown as jest.Mock
    ).mockReturnValue(null);

    const { result } = renderHookWithProvider(useAddTokenCallback);

    await act(async () => {
      await result.current(TOKEN_REQUEST);
    });

    expect(mockAddToken).toHaveBeenCalled();
    expect(mockAddCustomAsset).not.toHaveBeenCalled();
  });

  it('throws when chain is not configured', async () => {
    mockFindNetworkClientIdByChainId.mockImplementation(() => {
      throw new Error('Network not found');
    });

    const { result } = renderHookWithProvider(useAddTokenCallback);

    await expect(result.current(TOKEN_REQUEST)).rejects.toThrow(
      'Network not found',
    );
  });
});
