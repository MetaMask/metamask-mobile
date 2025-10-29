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

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    TokensController: {
      addToken: jest.fn(),
    },
  },
}));

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

  const mockFindNetworkClientIdByChainId = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    mockFindNetworkClientIdByChainId.mockReturnValue(NETWORK_CLIENT_ID);
    mockAddToken.mockResolvedValue([]);
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
});
