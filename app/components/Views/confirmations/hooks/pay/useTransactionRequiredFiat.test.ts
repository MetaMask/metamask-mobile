import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import {
  TransactionToken,
  useTransactionRequiredTokens,
} from './useTransactionRequiredTokens';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  accountsControllerMock,
  tokenAddress1Mock,
  tokenAddress2Mock,
  tokensControllerMock,
} from '../../__mocks__/controllers/other-controllers-mock';

jest.mock('../tokens/useTokenFiatRates');
jest.mock('./useTransactionRequiredTokens');
jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');

function runHook(props: Parameters<typeof useTransactionRequiredFiat>[0] = {}) {
  const state = merge(
    {
      engine: {
        backgroundState,
      },
    },
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    tokensControllerMock,
    accountsControllerMock,
  );

  return renderHookWithProvider(() => useTransactionRequiredFiat(props), {
    state,
  }).result.current;
}

describe('useTransactionRequiredFiat', () => {
  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);
  const useTransactionRequiredTokensMock = jest.mocked(
    useTransactionRequiredTokens,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionRequiredTokensMock.mockReturnValue([
      {
        address: tokenAddress1Mock,
        amountHuman: '2',
        amountRaw: '2000',
        balanceHuman: '10',
        skipIfBalance: false,
      },
      {
        address: tokenAddress2Mock,
        amountHuman: '3',
        amountRaw: '3000',
        balanceHuman: '20',
        skipIfBalance: true,
      },
    ] as unknown as TransactionToken[]);

    useTokenFiatRatesMock.mockReturnValue([4, 5]);
  });

  it('returns fiat values for each required token', () => {
    const { values } = runHook();

    expect(values).toStrictEqual([
      {
        address: tokenAddress1Mock,
        amountFiat: 8,
        amountRaw: '2000',
        balanceFiat: 40,
        feeFiat: 0.2,
        skipIfBalance: false,
        totalFiat: 8.2,
      },
      {
        address: tokenAddress2Mock,
        amountFiat: 15,
        amountRaw: '3000',
        balanceFiat: 100,
        feeFiat: 0.375,
        skipIfBalance: true,
        totalFiat: 15.375,
      },
    ]);
  });

  it('returns total fiat value', () => {
    const { totalFiat } = runHook();
    expect(totalFiat).toBe(23.575);
  });

  it('supports amount overrides', () => {
    const { values } = runHook({
      amountOverrides: {
        [tokenAddress1Mock]: '4',
      },
    });

    expect(values).toStrictEqual([
      {
        address: tokenAddress1Mock,
        amountFiat: 16,
        amountRaw: '2000',
        balanceFiat: 40,
        feeFiat: 0.4,
        skipIfBalance: false,
        totalFiat: 16.4,
      },
      {
        address: tokenAddress2Mock,
        amountFiat: 15,
        amountRaw: '3000',
        balanceFiat: 100,
        feeFiat: 0.375,
        skipIfBalance: true,
        totalFiat: 15.375,
      },
    ]);
  });
});
