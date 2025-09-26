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
        {
          address: TOKEN_ADDRESS_1_MOCK,
          allowUnderMinimum: true,
          amountFiat: 10,
          amountRaw: '123',
          totalFiat: 16.123,
        },
        {
          address: TOKEN_ADDRESS_2_MOCK,
          allowUnderMinimum: false,
          amountFiat: 20,
          amountRaw: '234',
          totalFiat: 40.456,
        },
      ],
      totalFiat: 56.579,
    } as unknown as ReturnType<typeof useTransactionRequiredFiat>);

    useTokenFiatRatesMock.mockReturnValue([4]);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: tokenAddress1Mock,
        balance: '123.456',
        balanceFiat: '123.456',
        balanceRaw: '1234560',
        chainId: CHAIN_ID_MOCK,
        decimals: 4,
        symbol: 'TST',
        tokenFiatAmount: 123.456,
      },
      setPayToken: jest.fn(),
    });
  });

  it('returns source amounts', () => {
    const sourceAmounts = runHook();

    expect(sourceAmounts.amounts).toStrictEqual([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        allowUnderMinimum: true,
        amountHuman: '4.03075',
        amountHumanOriginal: '2.5',
        amountRaw: '40308',
        targetAmountRaw: '123',
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        allowUnderMinimum: false,
        amountHuman: '10.114',
        amountHumanOriginal: '5',
        amountRaw: '101140',
        targetAmountRaw: '234',
      },
    ]);
  });

  it('returns source amounts even if balance sufficient', () => {
    useTransactionRequiredFiatMock.mockReturnValue({
      values: [
        {
          address: TOKEN_ADDRESS_2_MOCK,
          allowUnderMinimum: true,
          amountFiat: 40.455,
          amountRaw: '234',
          balanceFiat: 40.456,
          totalFiat: 41,
          skipIfBalance: false,
        },
      ],
      totalFiat: 58,
    } as unknown as ReturnType<typeof useTransactionRequiredFiat>);

    const sourceAmounts = runHook();

    expect(sourceAmounts.amounts).toStrictEqual([
      {
        address: TOKEN_ADDRESS_2_MOCK,
        allowUnderMinimum: true,
        amountHuman: '10.25',
        amountHumanOriginal: '10.11375',
        amountRaw: '102500',
        targetAmountRaw: '234',
      },
    ]);
  });

  it('skips token if can skip and balance sufficient', () => {
    useTransactionRequiredFiatMock.mockReturnValue({
      values: [
        {
          address: TOKEN_ADDRESS_1_MOCK,
          allowUnderMinimum: true,
          amountFiat: 16.123,
          amountRaw: '123',
          balanceFiat: 16.124,
          totalFiat: 17,
          skipIfBalance: true,
        },
        {
          address: TOKEN_ADDRESS_2_MOCK,
          allowUnderMinimum: false,
          amountFiat: 40.456,
          amountRaw: '234',
          balanceFiat: 40.455,
          totalFiat: 41,
          skipIfBalance: false,
        },
      ],
      totalFiat: 58,
    } as unknown as ReturnType<typeof useTransactionRequiredFiat>);

    const sourceAmounts = runHook();

    expect(sourceAmounts.amounts).toStrictEqual([
      {
        address: TOKEN_ADDRESS_2_MOCK,
        allowUnderMinimum: false,
        amountHuman: '10.25',
        amountHumanOriginal: '10.114',
        amountRaw: '102500',
        targetAmountRaw: '234',
      },
    ]);
  });

  it('skips token if balance sufficient and pay token is same token', () => {
    useTransactionRequiredFiatMock.mockReturnValue({
      values: [
        {
          address: tokenAddress1Mock,
          allowUnderMinimum: true,
          amountFiat: 16.123,
          amountRaw: '123',
          balanceFiat: 16.124,
          totalFiat: 17,
          skipIfBalance: false,
        },
        {
          address: TOKEN_ADDRESS_2_MOCK,
          allowUnderMinimum: false,
          amountRaw: '234',
          amountFiat: 40.456,
          balanceFiat: 40.455,
          totalFiat: 41,
          skipIfBalance: false,
        },
      ],
      totalFiat: 58,
    } as unknown as ReturnType<typeof useTransactionRequiredFiat>);

    const sourceAmounts = runHook();

    expect(sourceAmounts.amounts).toStrictEqual([
      {
        address: TOKEN_ADDRESS_2_MOCK,
        allowUnderMinimum: false,
        amountHuman: '10.25',
        amountHumanOriginal: '10.114',
        amountRaw: '102500',
        targetAmountRaw: '234',
      },
    ]);
  });

  it('returns undefined if no fiat rate', () => {
    useTokenFiatRatesMock.mockReturnValue([]);

    const sourceAmounts = runHook();
    expect(sourceAmounts.amounts).toBeUndefined();
  });

  it('returns undefined if no pay token selected', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: jest.fn(),
    });

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
