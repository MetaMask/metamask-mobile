import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  accountsControllerMock,
  tokenAddress1Mock,
  tokensControllerMock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionPayTokenAmounts } from './useTransactionPayTokenAmounts';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { merge } from 'lodash';

jest.mock('./useTransactionRequiredFiat');
jest.mock('../tokens/useTokenFiatRates');
jest.mock('./useTransactionPayToken');

const TOKEN_ADDRESS_1_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const TOKEN_ADDRESS_2_MOCK = '0xabcdef1234567890abcdef1234567890abcdef12';
const CHAIN_ID_MOCK = '0x1';

function runHook({ noTokens }: { noTokens?: boolean } = {}) {
  const state = merge(
    noTokens ? {} : tokensControllerMock,
    accountsControllerMock,
  );

  return renderHookWithProvider(useTransactionPayTokenAmounts, { state }).result
    .current;
}

describe('useTransactionPayTokenAmounts', () => {
  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);
  const useTransactionRequiredFiatMock = jest.mocked(
    useTransactionRequiredFiat,
  );
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionRequiredFiatMock.mockReturnValue({
      values: [
        { address: TOKEN_ADDRESS_1_MOCK, totalFiat: 16.123 },
        { address: TOKEN_ADDRESS_2_MOCK, totalFiat: 40.456 },
      ],
      totalFiat: 56.579,
    } as unknown as ReturnType<typeof useTransactionRequiredFiat>);

    useTokenFiatRatesMock.mockReturnValue([4]);

    useTransactionPayTokenMock.mockReturnValue({
      balanceFiat: '123.456',
      balanceHuman: '123.456',
      decimals: 4,
      payToken: {
        address: tokenAddress1Mock,
        chainId: CHAIN_ID_MOCK,
      },
      setPayToken: jest.fn(),
    });
  });

  it('returns source amounts', () => {
    const sourceAmounts = runHook();

    expect(sourceAmounts.amounts).toStrictEqual([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        amountHuman: '4.03075',
        amountRaw: '40308',
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        amountHuman: '10.114',
        amountRaw: '101140',
      },
    ]);
  });

  it('returns undefined if no fiat rate', () => {
    useTokenFiatRatesMock.mockReturnValue([]);

    const sourceAmounts = runHook();
    expect(sourceAmounts.amounts).toBeUndefined();
  });

  it('returns undefined if no pay token selected', () => {
    useTransactionPayTokenMock.mockReturnValue({ setPayToken: jest.fn() });

    const sourceAmounts = runHook();
    expect(sourceAmounts.amounts).toBeUndefined();
  });

  it('returns total amounts', () => {
    const sourceAmounts = runHook();

    expect(sourceAmounts).toEqual(
      expect.objectContaining({
        totalHuman: '14.14475',
        totalRaw: '141448',
      }),
    );
  });
});
