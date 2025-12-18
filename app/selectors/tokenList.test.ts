import { selectSortedTokenKeys } from './tokenList';
import { selectTokenSortConfig } from './preferencesController';
import { selectIsEvmNetworkSelected } from './multichainNetworkController';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectSelectedInternalAccount } from './accountsController';
///: END:ONLY_INCLUDE_IF

import {
  selectEvmTokens,
  selectEvmTokenFiatBalances,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  selectMultichainTokenListForAccountId,
  ///: END:ONLY_INCLUDE_IF
} from './multichain';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { TokenI } from '../components/UI/Tokens/types';
import { RootState } from '../reducers';

jest.mock('./preferencesController');
jest.mock('./multichainNetworkController');
jest.mock('./accountsController');
jest.mock('./multichain', () => ({
  selectEvmTokens: jest.fn(),
  selectEvmTokenFiatBalances: jest.fn(),
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  selectMultichainTokenListForAccountId: jest.fn(),
  ///: END:ONLY_INCLUDE_IF
}));
jest.mock('../store', () => ({
  store: { getState: jest.fn() },
}));

// This selector consumes many selectors and is very hard to create exact state
// So instead uses mocks to simulate the internal selector changes
describe('selectSortedTokenKeys', () => {
  const mockState = () => ({}) as unknown as RootState;

  const createEvmTokens = (tokenAddrs: string[]) =>
    tokenAddrs.map(
      (address) =>
        ({
          address,
          chainId: '0x1',
          isStaked: false,
        }) as TokenI,
    );

  const createNonEvmTokens = (tokenAddrs: string[]) =>
    tokenAddrs.map(
      (address, idx) =>
        ({
          address,
          chainId: '0x1337',
          isStaked: undefined,
          balanceFiat: idx + 10,
        }) as unknown as ReturnType<
          typeof selectMultichainTokenListForAccountId
        >[number],
    );

  const arrangeMocks = () => {
    const mockSelectTokenSortConfig = jest
      .mocked(selectTokenSortConfig)
      .mockReturnValue({
        key: 'tokenFiatAmount',
        order: 'dsc',
        sortCallback: 'stringNumeric',
      });

    const mockSelectIsEvmNetworkSelected = jest
      .mocked(selectIsEvmNetworkSelected)
      .mockReturnValue(true);

    const mockEvmTokens = createEvmTokens([
      'tokenAddr1',
      'tokenAddr2',
      'tokenAddr3',
    ]);
    const mockSelectEvmTokens = jest
      .mocked(selectEvmTokens)
      .mockReturnValue(mockEvmTokens);

    const mockEvmTotalFiatBalance = mockEvmTokens.map((_, idx) => idx + 1);

    const mockSelectEvmTokenFiatBalances = jest
      .mocked(selectEvmTokenFiatBalances)
      .mockReturnValue(mockEvmTotalFiatBalance);

    const mockSelectSelectedInternalAccount = jest
      .mocked(selectSelectedInternalAccount)
      .mockReturnValue({ id: 'account1' } as InternalAccount);

    const mockNonEvmTokens = createNonEvmTokens([
      'tokenAddrA',
      'tokenAddrB',
      'tokenAddrC',
    ]);
    const mockSelectMultichainTokenListForAccountId = jest
      .mocked(selectMultichainTokenListForAccountId)
      .mockReturnValue(mockNonEvmTokens);

    return {
      mockSelectTokenSortConfig,
      mockSelectIsEvmNetworkSelected,
      mockSelectEvmTokens,
      mockSelectEvmTokenFiatBalances,
      mockSelectSelectedInternalAccount,
      mockSelectMultichainTokenListForAccountId,
    };
  };

  // Setup mocks
  beforeEach(() => {
    jest.clearAllMocks();
    selectSortedTokenKeys.resetRecomputations();
  });

  it('returns an array of ordered evm token keys', () => {
    const { mockSelectEvmTokens, mockSelectEvmTokenFiatBalances } =
      arrangeMocks();

    // Arrange - setup tokens
    mockSelectEvmTokens.mockReturnValue(createEvmTokens(['0x1', '0x2', '0x3']));
    mockSelectEvmTokenFiatBalances.mockReturnValue([1, 2, 3]);

    const result = selectSortedTokenKeys(mockState());
    expect(result.map((r) => r.address)).toStrictEqual(['0x3', '0x2', '0x1']);
  });

  it('returns an array of ordered non-evm token keys', () => {
    const {
      mockSelectIsEvmNetworkSelected,
      mockSelectMultichainTokenListForAccountId,
    } = arrangeMocks();

    mockSelectIsEvmNetworkSelected.mockReturnValueOnce(false);

    // Arrange - setup tokens
    const nonEvmTokens = createNonEvmTokens(['0x4', '0x5', '0x6']);
    nonEvmTokens[0].balanceFiat = '4';
    nonEvmTokens[1].balanceFiat = '5';
    nonEvmTokens[2].balanceFiat = '6';
    mockSelectMultichainTokenListForAccountId.mockReturnValue(nonEvmTokens);

    const result = selectSortedTokenKeys(mockState());
    expect(result.map((r) => r.address)).toStrictEqual(['0x6', '0x5', '0x4']);
  });

  it('returns the exact same result when input values/selectors are the same', () => {
    arrangeMocks();
    const result1 = selectSortedTokenKeys(mockState());
    const result2 = selectSortedTokenKeys(mockState());
    expect(result1).toBe(result2);
  });

  it('returns the exact same result when evm fiat fluctuates a tiny bit', () => {
    const { mockSelectEvmTokenFiatBalances } = arrangeMocks();

    mockSelectEvmTokenFiatBalances.mockReturnValue([1, 2, 3]);
    const result1 = selectSortedTokenKeys(mockState());

    // fiat values changed, but order remains the same
    mockSelectEvmTokenFiatBalances.mockReturnValue([1.1, 2.2, 3.3]);
    const result2 = selectSortedTokenKeys(mockState());

    expect(result1).toBe(result2);
  });

  it('returns a new list or sorted keys when evm fiat changes order', () => {
    const { mockSelectEvmTokenFiatBalances } = arrangeMocks();

    mockSelectEvmTokenFiatBalances.mockReturnValue([1, 2, 3]);
    const result1 = selectSortedTokenKeys(mockState());

    // fiat values changed drastically, order has changed
    mockSelectEvmTokenFiatBalances.mockReturnValue([3, 2, 1]);
    const result2 = selectSortedTokenKeys(mockState());

    expect(result1).not.toBe(result2);
  });
});
