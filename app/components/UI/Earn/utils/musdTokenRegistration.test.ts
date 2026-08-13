import { TokensControllerState } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../core/Engine';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { getTokensControllerAllTokens } from '../../../../selectors/assets/assets-migration';
import { store } from '../../../../store';
import { ensureMusdTokenRegistered } from './musdTokenRegistration';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {},
  },
}));

jest.mock('../../../../selectors/assets/assets-migration', () => ({
  getTokensControllerAllTokens: jest.fn(),
}));

jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../constants/musd', () => ({
  /**
   * Mutable mapping so tests can override per-case.
   */
  MUSD_TOKEN_ADDRESS_BY_CHAIN: {},
  MUSD_TOKEN: {
    symbol: 'mUSD',
    name: 'MetaMask USD',
    decimals: 6,
  },
}));

interface MockedEngineContext {
  TokensController: {
    addToken: jest.Mock<
      Promise<void>,
      [
        {
          address: string;
          decimals: number;
          name: string;
          symbol: string;
          networkClientId: string;
        },
      ]
    >;
  };
}

const mockedEngine = Engine as unknown as { context: MockedEngineContext };
const mockedStore = jest.mocked(store);
const mockedGetTokensControllerAllTokens = jest.mocked(
  getTokensControllerAllTokens,
);

describe('ensureMusdTokenRegistered', () => {
  const MUSD_ADDRESS = '0xmusdAddress' as Hex;
  const CHAIN_ID = '0x1' as Hex;
  const NETWORK_CLIENT_ID = 'mainnet';

  const tokensControllerAddToken = jest.fn<
    Promise<void>,
    [
      {
        address: string;
        decimals: number;
        name: string;
        symbol: string;
        networkClientId: string;
      },
    ]
  >();

  beforeEach(() => {
    jest.clearAllMocks();

    mockedEngine.context = {
      TokensController: {
        addToken: tokensControllerAddToken,
      },
    };

    (MUSD_TOKEN_ADDRESS_BY_CHAIN as Record<string, Hex>)[CHAIN_ID] =
      MUSD_ADDRESS;

    mockedStore.getState.mockReturnValue(
      {} as ReturnType<typeof store.getState>,
    );
    mockedGetTokensControllerAllTokens.mockReturnValue({});
  });

  describe('when mUSD token address is not configured for the chain', () => {
    it('returns early without calling addToken', async () => {
      const unknownChainId = '0xdead' as Hex;

      await ensureMusdTokenRegistered({
        chainId: unknownChainId,
        networkClientId: NETWORK_CLIENT_ID,
      });

      expect(tokensControllerAddToken).not.toHaveBeenCalled();
    });
  });

  describe('when mUSD token is already registered for the chain', () => {
    it('does not call addToken when the token exists for one account', async () => {
      mockedGetTokensControllerAllTokens.mockReturnValue({
        [CHAIN_ID]: {
          '0xaccountAddress': [{ address: MUSD_ADDRESS }],
        },
      } as unknown as TokensControllerState['allTokens']);

      await ensureMusdTokenRegistered({
        chainId: CHAIN_ID,
        networkClientId: NETWORK_CLIENT_ID,
      });

      expect(tokensControllerAddToken).not.toHaveBeenCalled();
    });
  });

  describe('when mUSD token is not yet registered', () => {
    it('calls addToken with the correct token metadata and networkClientId', async () => {
      mockedGetTokensControllerAllTokens.mockReturnValue({});
      tokensControllerAddToken.mockResolvedValue(undefined);

      await ensureMusdTokenRegistered({
        chainId: CHAIN_ID,
        networkClientId: NETWORK_CLIENT_ID,
      });

      expect(tokensControllerAddToken).toHaveBeenCalledTimes(1);
      expect(tokensControllerAddToken).toHaveBeenCalledWith({
        address: MUSD_ADDRESS,
        decimals: 6,
        name: 'MetaMask USD',
        symbol: 'mUSD',
        networkClientId: NETWORK_CLIENT_ID,
      });
    });

    it('calls addToken when the chain entry exists but no accounts hold mUSD', async () => {
      mockedGetTokensControllerAllTokens.mockReturnValue({
        [CHAIN_ID]: {
          '0xaccountAddress': [{ address: '0xdifferentTokenAddress' }],
        },
      } as unknown as TokensControllerState['allTokens']);
      tokensControllerAddToken.mockResolvedValue(undefined);

      await ensureMusdTokenRegistered({
        chainId: CHAIN_ID,
        networkClientId: NETWORK_CLIENT_ID,
      });

      expect(tokensControllerAddToken).toHaveBeenCalledTimes(1);
      expect(tokensControllerAddToken).toHaveBeenCalledWith({
        address: MUSD_ADDRESS,
        decimals: 6,
        name: 'MetaMask USD',
        symbol: 'mUSD',
        networkClientId: NETWORK_CLIENT_ID,
      });
    });

    it('calls addToken when allTokens has no entry for the chain', async () => {
      mockedGetTokensControllerAllTokens.mockReturnValue({ '0xe708': {} });
      tokensControllerAddToken.mockResolvedValue(undefined);

      await ensureMusdTokenRegistered({
        chainId: CHAIN_ID,
        networkClientId: NETWORK_CLIENT_ID,
      });

      expect(tokensControllerAddToken).toHaveBeenCalledTimes(1);
    });
  });
});
