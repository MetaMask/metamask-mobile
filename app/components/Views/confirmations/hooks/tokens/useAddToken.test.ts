import Engine from '../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act } from '@testing-library/react-native';
import { useAddToken } from './useAddToken';
import { merge } from 'lodash';
import {
  accountMock,
  otherControllersMock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { Token } from '@metamask/assets-controllers';
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

async function runHook({
  existingTokens,
}: { existingTokens?: Partial<Token>[] } = {}) {
  const result = renderHookWithProvider(
    () =>
      useAddToken({
        tokenAddress: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        symbol: SYMBOL_MOCK,
        decimals: DECIMALS_MOCK,
        name: NAME_MOCK,
      }),
    {
      state: merge({}, otherControllersMock, {
        engine: {
          backgroundState: {
            TokensController: {
              allTokens: {
                [CHAIN_ID_MOCK]: {
                  [accountMock]: existingTokens || [],
                },
              },
            },
          },
        },
      }),
    },
  );

  await act(async () => {
    // Intentionally empty
  });

  return result;
}

describe('useAddToken', () => {
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
      address: accountMock,
      type: 'eip155:eoa',
    });
  });

  it('adds token if not present', async () => {
    await runHook();

    expect(mockAddToken).toHaveBeenCalledWith({
      address: TOKEN_ADDRESS_MOCK,
      decimals: DECIMALS_MOCK,
      name: NAME_MOCK,
      networkClientId: NETWORK_CLIENT_ID,
      symbol: SYMBOL_MOCK,
    });
  });

  it('does not add token if already present', async () => {
    await runHook({
      existingTokens: [
        {
          address: TOKEN_ADDRESS_MOCK,
        },
      ],
    });

    expect(mockAddToken).not.toHaveBeenCalled();
  });

  it('does not call addCustomAsset when assetsUnifyState is disabled', async () => {
    await runHook();

    expect(mockAddToken).toHaveBeenCalled();
    expect(mockAddCustomAsset).not.toHaveBeenCalled();
  });

  it('calls addCustomAsset when assetsUnifyState is enabled', async () => {
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      true,
    );

    await runHook();

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

  it('does not add token if already present with assetsUnifyState enabled', async () => {
    (selectIsAssetsUnifyStateEnabled as unknown as jest.Mock).mockReturnValue(
      false,
    );

    await runHook({
      existingTokens: [{ address: TOKEN_ADDRESS_MOCK }],
    });

    expect(mockAddToken).not.toHaveBeenCalled();
    expect(mockAddCustomAsset).not.toHaveBeenCalled();
  });
});
