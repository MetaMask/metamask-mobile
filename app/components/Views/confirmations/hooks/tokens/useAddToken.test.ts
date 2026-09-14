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
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectTokensByChainIdAndAddress } from '../../../../../selectors/tokensController';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AssetsController: {
      addCustomAsset: jest.fn(),
    },
  },
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectSelectedAccountGroupEvmInternalAccount: jest.fn(() => null),
  }),
);

jest.mock('../../../../../selectors/tokensController', () => ({
  ...jest.requireActual('../../../../../selectors/tokensController'),
  selectTokensByChainIdAndAddress: jest.fn(),
}));

const ACCOUNT_ID_MOCK = 'mock-account-id';
const TOKEN_ADDRESS_MOCK = '0x1234' as const;
const CHAIN_ID_MOCK = '0x1' as const;
const SYMBOL_MOCK = 'TST';
const DECIMALS_MOCK = 6;
const NAME_MOCK = 'Test Token';

async function runHook({
  existingTokens,
}: { existingTokens?: Partial<Token>[] } = {}) {
  (selectTokensByChainIdAndAddress as unknown as jest.Mock).mockReturnValue(
    existingTokens ?? [],
  );

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
      state: merge({}, otherControllersMock),
    },
  );

  await act(async () => {
    // Intentionally empty
  });

  return result;
}

describe('useAddToken', () => {
  const mockAddCustomAsset = jest.mocked(
    Engine.context.AssetsController.addCustomAsset,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    mockAddCustomAsset.mockResolvedValue(undefined);
    (
      selectSelectedAccountGroupEvmInternalAccount as unknown as jest.Mock
    ).mockReturnValue({
      id: ACCOUNT_ID_MOCK,
      address: accountMock,
      type: 'eip155:eoa',
    });
  });

  it('calls addCustomAsset when token is not present', async () => {
    await runHook();

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

  it('does not call addCustomAsset when token is already present', async () => {
    await runHook({
      existingTokens: [
        {
          address: TOKEN_ADDRESS_MOCK,
        },
      ],
    });

    expect(mockAddCustomAsset).not.toHaveBeenCalled();
  });

  it('does not call addCustomAsset when there is no selected EVM account', async () => {
    (
      selectSelectedAccountGroupEvmInternalAccount as unknown as jest.Mock
    ).mockReturnValue(null);

    await runHook();

    expect(mockAddCustomAsset).not.toHaveBeenCalled();
  });
});
